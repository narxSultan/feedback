const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const sessionService = require('../services/sessionService');
const { signAdminToken } = require('../utils/tokenHelper');

async function resolveAdminTableId(req, db = pool) {
  if (req.session?.account_type === 'admin') {
    return req.admin?.id || null;
  }
  if (req.session?.account_type === 'user' && req.admin?.id) {
    const linked = await db.query(
      `SELECT id
       FROM admins
       WHERE linked_user_id = $1
       LIMIT 1`,
      [req.admin.id]
    );
    return linked.rows[0]?.id || null;
  }
  return null;
}

async function loginAdmin(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const result = await pool.query(
      'SELECT id, name, email, password_hash, profile_image_url FROM admins WHERE email = $1',
      [email]
    );

    if (!result.rows.length) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const admin = result.rows[0];
    const isValid = await bcrypt.compare(password, admin.password_hash);

    if (!isValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const sessionId = await sessionService.createSession({
      accountType: 'admin',
      accountId: admin.id,
      deviceInfo: req.headers['user-agent'] || null
    });

    return res.json({
      token: signAdminToken(admin, sessionId),
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        profile_image_url: admin.profile_image_url,
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function getMyProfile(req, res, next) {
  try {
    const adminId = req.admin?.id;
    const isUserBackedAdmin = req.session?.account_type === 'user';
    if (!adminId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const result = isUserBackedAdmin
      ? await pool.query(
        `SELECT id, name, email, profile_image_url, created_at
         FROM users
         WHERE id = $1 AND role = 'admin'
         LIMIT 1`,
        [adminId]
      )
      : await pool.query(
        `SELECT id, name, email, profile_image_url, created_at
         FROM admins
         WHERE id = $1
         LIMIT 1`,
        [adminId]
      );

    if (!result.rows.length) {
      return res.status(404).json({ message: 'Admin profile not found' });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    return next(error);
  }
}

async function updateMyProfile(req, res, next) {
  try {
    const adminId = req.admin?.id;
    const isUserBackedAdmin = req.session?.account_type === 'user';
    const { name, profileImageUrl } = req.body;

    if (!adminId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const result = isUserBackedAdmin
      ? await pool.query(
        `UPDATE users
         SET name = COALESCE($1, name),
             profile_image_url = COALESCE($2, profile_image_url)
         WHERE id = $3 AND role = 'admin'
         RETURNING id, name, email, profile_image_url, created_at`,
        [name || null, profileImageUrl || null, adminId]
      )
      : await pool.query(
        `UPDATE admins
         SET name = COALESCE($1, name),
             profile_image_url = COALESCE($2, profile_image_url)
         WHERE id = $3
         RETURNING id, name, email, profile_image_url, linked_user_id, created_at`,
        [name || null, profileImageUrl || null, adminId]
      );

    if (!result.rows.length) {
      return res.status(404).json({ message: 'Admin profile not found' });
    }

    if (isUserBackedAdmin) {
      await pool.query(
        `UPDATE admins
         SET name = $1,
             email = $2,
             profile_image_url = COALESCE($3, profile_image_url)
         WHERE linked_user_id = $4`,
        [result.rows[0].name, result.rows[0].email, profileImageUrl || null, adminId]
      );
    } else if (result.rows[0].linked_user_id) {
      await pool.query(
        `UPDATE users
         SET name = $1,
             profile_image_url = COALESCE($2, profile_image_url)
         WHERE id = $3 AND role = 'admin'`,
        [result.rows[0].name, profileImageUrl || null, result.rows[0].linked_user_id]
      );
    }

    return res.json(result.rows[0]);
  } catch (error) {
    return next(error);
  }
}

async function uploadAdminProfileImage(req, res, next) {
  try {
    const adminId = req.admin?.id;
    const isUserBackedAdmin = req.session?.account_type === 'user';

    if (!adminId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Image file is required' });
    }

    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    const result = isUserBackedAdmin
      ? await pool.query(
        `UPDATE users
         SET profile_image_url = $1
         WHERE id = $2 AND role = 'admin'
         RETURNING id, name, email, profile_image_url, created_at`,
        [fileUrl, adminId]
      )
      : await pool.query(
        `UPDATE admins
         SET profile_image_url = $1
         WHERE id = $2
         RETURNING id, name, email, profile_image_url, linked_user_id, created_at`,
        [fileUrl, adminId]
      );

    if (!result.rows.length) {
      return res.status(404).json({ message: 'Admin profile not found' });
    }

    if (isUserBackedAdmin) {
      await pool.query(
        `UPDATE admins
         SET profile_image_url = $1
         WHERE linked_user_id = $2`,
        [fileUrl, adminId]
      );
    } else if (result.rows[0].linked_user_id) {
      await pool.query(
        `UPDATE users
         SET profile_image_url = $1
         WHERE id = $2 AND role = 'admin'`,
        [fileUrl, result.rows[0].linked_user_id]
      );
    }

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    return next(error);
  }
}

async function getUsers(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT id, name, email, organization, role, profile_image_url, created_at
       FROM users
       ORDER BY created_at DESC`
    );
    return res.json(result.rows);
  } catch (error) {
    return next(error);
  }
}

async function updateUserRole(req, res, next) {
  const client = await pool.connect();
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ message: "role must be 'user' or 'admin'" });
    }

    await client.query('BEGIN');

    const result = await client.query(
      `UPDATE users
       SET role = $1
       WHERE id = $2
       RETURNING id, name, email, role, password_hash, profile_image_url`,
      [role, userId]
    );

    if (!result.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'User not found' });
    }

    const user = result.rows[0];

    if (role === 'admin') {
      const linkedByUser = await client.query(
        `SELECT id FROM admins WHERE linked_user_id = $1 LIMIT 1`,
        [user.id]
      );

      if (linkedByUser.rows.length) {
        await client.query(
          `UPDATE admins
           SET name = $1,
               email = $2,
               password_hash = $3,
               profile_image_url = COALESCE($4, profile_image_url)
           WHERE id = $5`,
          [user.name, user.email, user.password_hash, user.profile_image_url || null, linkedByUser.rows[0].id]
        );
      } else {
        const linkedByEmail = await client.query(
          `SELECT id FROM admins WHERE LOWER(email) = LOWER($1) LIMIT 1`,
          [user.email]
        );

        if (linkedByEmail.rows.length) {
          await client.query(
            `UPDATE admins
             SET linked_user_id = $1,
                 name = $2,
                 password_hash = $3,
                 profile_image_url = COALESCE($4, profile_image_url)
             WHERE id = $5`,
            [user.id, user.name, user.password_hash, user.profile_image_url || null, linkedByEmail.rows[0].id]
          );
        } else {
          await client.query(
            `INSERT INTO admins (name, email, password_hash, profile_image_url, linked_user_id)
             VALUES ($1, $2, $3, $4, $5)`,
            [user.name, user.email, user.password_hash, user.profile_image_url || null, user.id]
          );
        }
      }
    } else {
      await client.query(
        `DELETE FROM admins
         WHERE linked_user_id = $1`,
        [user.id]
      );
    }

    await client.query('COMMIT');

    return res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (_) {
      // Ignore rollback failure; surface original error.
    }
    return next(error);
  } finally {
    client.release();
  }
}

async function resetUserPassword(req, res, next) {
  try {
    const { userId } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || String(newPassword).length < 6) {
      return res.status(400).json({ message: 'newPassword must be at least 6 characters' });
    }

    const passwordHash = await bcrypt.hash(String(newPassword), 10);

    const result = await pool.query(
      `UPDATE users
       SET password_hash = $1
       WHERE id = $2
       RETURNING id, name, email`,
      [passwordHash, userId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: 'User not found' });
    }

    await pool.query(
      `UPDATE admins
       SET password_hash = $1
       WHERE linked_user_id = $2`,
      [passwordHash, userId]
    );

    return res.json({ message: 'User password reset successfully', user: result.rows[0] });
  } catch (error) {
    return next(error);
  }
}

async function changeAdminPassword(req, res, next) {
  try {
    const adminId = req.admin?.id;
    const isUserBackedAdmin = req.session?.account_type === 'user';
    const { newPassword } = req.body;

    if (!adminId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!newPassword || String(newPassword).length < 6) {
      return res.status(400).json({ message: 'newPassword must be at least 6 characters' });
    }

    const passwordHash = await bcrypt.hash(String(newPassword), 10);

    const result = isUserBackedAdmin
      ? await pool.query(
        `UPDATE users
         SET password_hash = $1
         WHERE id = $2 AND role = 'admin'
         RETURNING id`,
        [passwordHash, adminId]
      )
      : await pool.query(
        `UPDATE admins
         SET password_hash = $1
         WHERE id = $2
         RETURNING id, linked_user_id`,
        [passwordHash, adminId]
      );

    if (!result.rows.length) {
      return res.status(404).json({ message: 'Admin profile not found' });
    }

    if (isUserBackedAdmin) {
      await pool.query(
        `UPDATE admins
         SET password_hash = $1
         WHERE linked_user_id = $2`,
        [passwordHash, adminId]
      );
    } else if (result.rows[0].linked_user_id) {
      await pool.query(
        `UPDATE users
         SET password_hash = $1
         WHERE id = $2 AND role = 'admin'`,
        [passwordHash, result.rows[0].linked_user_id]
      );
    }

    return res.json({ message: 'Password updated successfully' });
  } catch (error) {
    return next(error);
  }
}

async function getUserActivities(req, res, next) {
  try {
    const search = String(req.query.search || '').trim();
    const searchLike = `%${search}%`;

    const result = await pool.query(
      `SELECT
         ua.id,
         ua.user_id,
         u.name AS user_name,
         u.email AS user_email,
         ua.activity_type,
         ua.meta,
         ua.created_at
       FROM user_activities ua
       JOIN users u ON u.id = ua.user_id
       WHERE ($1 = '' OR u.name ILIKE $2 OR u.email ILIKE $2)
       ORDER BY ua.created_at DESC
       LIMIT 500`,
      [search, searchLike]
    );
    return res.json(result.rows);
  } catch (error) {
    return next(error);
  }
}

async function getPublicFeedback(req, res, next) {
  try {
    const search = (req.query.search || '').trim();
    const searchLike = `%${search}%`;

    const result = await pool.query(
      `SELECT
         f.id,
         f.rating,
         f.satisfaction,
         f.comment,
         f.name,
         f.email,
         f.custom_answers,
         f.created_at,
         e.id AS event_id,
         e.title AS event_title,
         e.event_code
       FROM feedback f
       JOIN events e ON e.id = f.event_id
       WHERE ($1 = '' OR e.event_code ILIKE $2 OR e.title ILIKE $2)
       ORDER BY f.created_at DESC
       LIMIT 300`,
      [search, searchLike]
    );

    return res.json(result.rows);
  } catch (error) {
    return next(error);
  }
}

async function getAds(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT
         id,
         title,
         description,
         image_url,
         target_url,
         is_active,
         end_date,
         created_at,
         (end_date IS NOT NULL AND end_date < CURRENT_DATE) AS is_expired
       FROM ad_slides
       ORDER BY created_at DESC`
    );
    return res.json(result.rows);
  } catch (error) {
    return next(error);
  }
}

async function createAd(req, res, next) {
  try {
    const adminId = await resolveAdminTableId(req);
    const { title, description, imageUrl, targetUrl, isActive, endDate } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ message: 'imageUrl is required' });
    }

    const result = await pool.query(
      `INSERT INTO ad_slides (title, description, image_url, target_url, is_active, end_date, created_by_admin)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, title, description, image_url, target_url, is_active, end_date, created_at,
         (end_date IS NOT NULL AND end_date < CURRENT_DATE) AS is_expired`,
      [title || null, description || null, imageUrl, targetUrl || null, isActive !== false, endDate || null, adminId || null]
    );

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    return next(error);
  }
}

async function updateAd(req, res, next) {
  try {
    const { adId } = req.params;
    const { title, description, imageUrl, targetUrl, isActive, endDate } = req.body;

    const result = await pool.query(
      `UPDATE ad_slides
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           image_url = COALESCE($3, image_url),
           target_url = COALESCE($4, target_url),
           is_active = COALESCE($5, is_active),
           end_date = COALESCE($6, end_date)
       WHERE id = $7
       RETURNING id, title, description, image_url, target_url, is_active, end_date, created_at,
         (end_date IS NOT NULL AND end_date < CURRENT_DATE) AS is_expired`,
      [title || null, description || null, imageUrl || null, targetUrl || null, isActive, endDate || null, adId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: 'Ad not found' });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    return next(error);
  }
}

async function deleteAd(req, res, next) {
  try {
    const { adId } = req.params;
    const result = await pool.query(
      `DELETE FROM ad_slides
       WHERE id = $1
       RETURNING id`,
      [adId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: 'Ad not found' });
    }

    return res.json({ message: 'Ad deleted successfully' });
  } catch (error) {
    return next(error);
  }
}

function uploadAdImage(req, res) {
  if (!req.file) {
    return res.status(400).json({ message: 'Image file is required' });
  }

  const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  return res.status(201).json({ imageUrl: fileUrl });
}

module.exports = {
  loginAdmin,
  getUsers,
  getMyProfile,
  updateMyProfile,
  uploadAdminProfileImage,
  getAds,
  createAd,
  updateAd,
  deleteAd,
  uploadAdImage,
  getUserActivities,
  getPublicFeedback,
  updateUserRole,
  resetUserPassword,
  changeAdminPassword,
};
