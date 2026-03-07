const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { generateEventCode } = require('../utils/codeGenerator');
const { logUserActivity } = require('../utils/activityLogger');

function actorId(req) {
  return req.actor?.id;
}

function normalizeFormSchema(input) {
  if (!input || typeof input !== 'object') {
    return null;
  }

  const questions = Array.isArray(input.questions) ? input.questions : [];
  const normalized = questions
    .map((question, index) => {
      const label = String(question?.label || '').trim();
      const type = String(question?.type || '').trim();
      const id = String(question?.id || `q_${index + 1}`).trim();
      const required = Boolean(question?.required);

      if (!label || !['text', 'radio', 'checkbox'].includes(type) || !id) {
        return null;
      }

      if (type === 'radio' || type === 'checkbox') {
        const options = Array.isArray(question?.options)
          ? question.options.map((opt) => String(opt || '').trim()).filter(Boolean)
          : [];
        if (!options.length) {
          return null;
        }
        return { id, label, type, required, options };
      }

      return { id, label, type, required };
    })
    .filter(Boolean);

  if (!normalized.length) {
    return null;
  }

  return {
    version: 1,
    questions: normalized,
  };
}

async function getUserDashboard(req, res, next) {
  try {
    const userId = actorId(req);

    const profileResult = await pool.query(
      `SELECT id, name, email, organization, role, profile_image_url, created_at
       FROM users
       WHERE id = $1`,
      [userId]
    );

    if (!profileResult.rows.length) {
      return res.status(404).json({ message: 'User profile not found' });
    }

    const eventsResult = await pool.query(
      `SELECT
         e.id,
         e.title,
         e.description,
         e.event_date,
         e.end_date,
         e.location,
         e.image_url,
         e.event_code,
         e.feedback_form_schema,
         e.created_at,
         COUNT(f.id)::INT AS feedback_count,
         (e.end_date IS NOT NULL AND e.end_date < CURRENT_DATE) AS is_expired
       FROM events e
       LEFT JOIN feedback f ON f.event_id = e.id
       WHERE e.created_by_user = $1
       GROUP BY e.id
       ORDER BY e.created_at DESC`,
      [userId]
    );

    const paymentsResult = await pool.query(
      `SELECT id, payment_type, amount, status, note, created_at
       FROM user_payments
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 20`,
      [userId]
    );

    return res.json({
      profile: profileResult.rows[0],
      events: eventsResult.rows,
      payments: paymentsResult.rows,
    });
  } catch (error) {
    return next(error);
  }
}

async function createUserEvent(req, res, next) {
  try {
    const userId = actorId(req);
    const { title, description, eventDate, endDate, location, imageUrl, customFormSchema } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'Event title is required' });
    }

    const normalizedFormSchema = normalizeFormSchema(customFormSchema);

    let inserted = null;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = generateEventCode();
      try {
        const result = await pool.query(
          `INSERT INTO events (title, description, event_date, end_date, location, image_url, event_code, created_by_user, feedback_form_schema)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING id, title, description, event_date, end_date, location, image_url, event_code, feedback_form_schema, created_at,
             (end_date IS NOT NULL AND end_date < CURRENT_DATE) AS is_expired`,
          [title, description || null, eventDate || null, endDate || null, location || null, imageUrl || null, code, userId, normalizedFormSchema]
        );
        inserted = result.rows[0];
        break;
      } catch (err) {
        if (err.code !== '23505') {
          throw err;
        }
      }
    }

    if (!inserted) {
      return res.status(500).json({ message: 'Could not generate unique event code' });
    }

    await logUserActivity(userId, 'create_event', { eventId: inserted.id, eventCode: inserted.event_code });
    return res.status(201).json(inserted);
  } catch (error) {
    return next(error);
  }
}

async function createPayment(req, res, next) {
  try {
    const userId = actorId(req);
    const { paymentType, amount, note } = req.body;

    if (!paymentType || !['subscription', 'donation'].includes(paymentType)) {
      return res.status(400).json({ message: 'paymentType must be subscription or donation' });
    }
    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ message: 'Valid amount is required' });
    }

    const inserted = await pool.query(
      `INSERT INTO user_payments (user_id, payment_type, amount, status, note)
       VALUES ($1, $2, $3, 'paid', $4)
       RETURNING id, user_id, payment_type, amount, status, note, created_at`,
      [userId, paymentType, amount, note || null]
    );

    await logUserActivity(userId, paymentType === 'subscription' ? 'pay_subscription' : 'make_donation', {
      amount,
      paymentId: inserted.rows[0].id,
    });

    return res.status(201).json(inserted.rows[0]);
  } catch (error) {
    return next(error);
  }
}

async function deletePayment(req, res, next) {
  try {
    const userId = actorId(req);
    const { paymentId } = req.params;

    const result = await pool.query(
      `DELETE FROM user_payments
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [paymentId, userId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: 'Payment record not found' });
    }

    await logUserActivity(userId, 'delete_payment_history_item', { paymentId: Number(paymentId) });
    return res.json({ message: 'Payment history item deleted' });
  } catch (error) {
    return next(error);
  }
}

async function clearPaymentHistory(req, res, next) {
  try {
    const userId = actorId(req);

    const result = await pool.query(
      `DELETE FROM user_payments
       WHERE user_id = $1`,
      [userId]
    );

    await logUserActivity(userId, 'clear_payment_history', { deletedCount: result.rowCount });
    return res.json({ message: 'Payment history cleared', deletedCount: result.rowCount });
  } catch (error) {
    return next(error);
  }
}

async function getEventFeedback(req, res, next) {
  try {
    const userId = actorId(req);
    const { eventId } = req.params;

    const owner = await pool.query(
      `SELECT id, title, event_code
       FROM events
       WHERE id = $1 AND created_by_user = $2`,
      [eventId, userId]
    );

    if (!owner.rows.length) {
      return res.status(404).json({ message: 'Event not found for this user' });
    }

    const feedbackResult = await pool.query(
      `SELECT id, event_id, rating, satisfaction, comment, name, email, custom_answers, created_at
       FROM feedback
       WHERE event_id = $1
       ORDER BY created_at DESC`,
      [eventId]
    );

    return res.json({
      event: owner.rows[0],
      feedback: feedbackResult.rows,
      count: feedbackResult.rows.length,
    });
  } catch (error) {
    return next(error);
  }
}

async function getFeedbackHistory(req, res, next) {
  try {
    const userId = actorId(req);

    const result = await pool.query(
      `SELECT
         f.id,
         f.event_id,
         e.title AS event_title,
         e.event_code,
         f.rating,
         f.satisfaction,
         f.comment,
         f.name,
         f.email,
         f.custom_answers,
         f.created_at
       FROM feedback f
       JOIN events e ON e.id = f.event_id
       WHERE e.created_by_user = $1
       ORDER BY f.created_at DESC
       LIMIT 1000`,
      [userId]
    );

    return res.json(result.rows);
  } catch (error) {
    return next(error);
  }
}

async function getMyProfile(req, res, next) {
  try {
    const userId = actorId(req);
    const result = await pool.query(
      `SELECT id, name, email, organization, role, profile_image_url, created_at
       FROM users
       WHERE id = $1`,
      [userId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    return next(error);
  }
}

async function updateMyProfile(req, res, next) {
  try {
    const userId = actorId(req);
    const { name, organization, profileImageUrl } = req.body;

    const result = await pool.query(
      `UPDATE users
       SET name = COALESCE($1, name),
           organization = COALESCE($2, organization),
           profile_image_url = COALESCE($3, profile_image_url)
       WHERE id = $4
       RETURNING id, name, email, organization, role, profile_image_url, created_at`,
      [name || null, organization || null, profileImageUrl || null, userId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    await logUserActivity(userId, 'update_profile');
    return res.json(result.rows[0]);
  } catch (error) {
    return next(error);
  }
}

async function changeMyPassword(req, res, next) {
  try {
    const userId = actorId(req);
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'currentPassword and valid newPassword are required' });
    }

    const result = await pool.query(
      `SELECT password_hash
       FROM users
       WHERE id = $1`,
      [userId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: 'User not found' });
    }

    const valid = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
    if (!valid) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await pool.query(
      `UPDATE users
       SET password_hash = $1
       WHERE id = $2`,
      [passwordHash, userId]
    );

    await logUserActivity(userId, 'change_password');
    return res.json({ message: 'Password changed successfully' });
  } catch (error) {
    return next(error);
  }
}

function uploadEventImage(req, res) {
  if (!req.file) {
    return res.status(400).json({ message: 'Image file is required' });
  }

  const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  return res.status(201).json({ imageUrl: fileUrl });
}

async function uploadProfileImage(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Image file is required' });
    }

    const userId = actorId(req);
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

    const result = await pool.query(
      `UPDATE users
       SET profile_image_url = $1
       WHERE id = $2
       RETURNING id, name, email, organization, role, profile_image_url, created_at`,
      [fileUrl, userId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    await logUserActivity(userId, 'upload_profile_image');
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getUserDashboard,
  createUserEvent,
  createPayment,
  deletePayment,
  clearPaymentHistory,
  getEventFeedback,
  getFeedbackHistory,
  getMyProfile,
  updateMyProfile,
  changeMyPassword,
  uploadEventImage,
  uploadProfileImage,
};
