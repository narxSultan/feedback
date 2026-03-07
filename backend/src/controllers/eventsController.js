const pool = require('../config/db');
const { generateEventCode } = require('../utils/codeGenerator');

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

async function getEvents(req, res, next) {
  try {
    const result = await pool.query(
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
       GROUP BY e.id
       ORDER BY e.created_at DESC`
    );
    return res.json(result.rows);
  } catch (error) {
    return next(error);
  }
}

async function getPublicEventSlides(req, res, next) {
  try {
    const [eventRows, adRows] = await Promise.all([
      pool.query(
        `SELECT
           id,
           title,
           image_url,
           event_code,
           NULL::TEXT AS description,
           NULL::TEXT AS target_url,
           'event'::TEXT AS slide_type,
           created_at
         FROM events
         WHERE end_date IS NULL OR end_date >= CURRENT_DATE
         ORDER BY created_at DESC
         LIMIT 200`
      ),
      pool.query(
        `SELECT
           id,
           title,
           image_url,
           NULL::TEXT AS event_code,
           description,
           target_url,
           'ad'::TEXT AS slide_type,
           created_at
         FROM ad_slides
         WHERE is_active = TRUE
           AND (end_date IS NULL OR end_date >= CURRENT_DATE)
         ORDER BY created_at DESC
         LIMIT 100`
      )
    ]);

    const slides = [...adRows.rows, ...eventRows.rows]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 300);

    return res.json(slides);
  } catch (error) {
    return next(error);
  }
}

async function getPublicAdById(req, res, next) {
  try {
    const { adId } = req.params;
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
       WHERE id = $1 AND is_active = TRUE
       LIMIT 1`,
      [adId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: 'Ad not found' });
    }

    if (result.rows[0].is_expired) {
      return res.status(410).json({ message: 'Ad hiyo imekwisha muda wake.' });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    return next(error);
  }
}

async function createEvent(req, res, next) {
  try {
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
          `INSERT INTO events (title, description, event_date, end_date, location, image_url, event_code, created_by, feedback_form_schema)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING id, title, description, event_date, end_date, location, image_url, event_code, feedback_form_schema, created_at,
             (end_date IS NOT NULL AND end_date < CURRENT_DATE) AS is_expired`,
          [
            title,
            description || null,
            eventDate || null,
            endDate || null,
            location || null,
            imageUrl || null,
            code,
            req.admin?.id || null,
            normalizedFormSchema,
          ]
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

    return res.status(201).json(inserted);
  } catch (error) {
    return next(error);
  }
}

async function updateEvent(req, res, next) {
  try {
    const { eventId } = req.params;
    const { title, description, eventDate, endDate, location, imageUrl, customFormSchema } = req.body;
    const actor = req.actor;

    const existing = await pool.query(
      `SELECT id, created_by_user
       FROM events
       WHERE id = $1
       LIMIT 1`,
      [eventId]
    );

    if (!existing.rows.length) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (actor?.role === 'user' && Number(existing.rows[0].created_by_user) !== Number(actor.id)) {
      return res.status(403).json({ message: 'You can only edit your own events' });
    }

    const hasCustomFormSchemaInput = customFormSchema !== undefined;
    const normalizedFormSchema = hasCustomFormSchemaInput ? normalizeFormSchema(customFormSchema) : null;

    const result = await pool.query(
      `UPDATE events
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           event_date = COALESCE($3, event_date),
           end_date = COALESCE($4, end_date),
           location = COALESCE($5, location),
           image_url = COALESCE($6, image_url),
           feedback_form_schema = CASE WHEN $7 THEN $8 ELSE feedback_form_schema END
       WHERE id = $9
       RETURNING id, title, description, event_date, end_date, location, image_url, event_code, feedback_form_schema, created_at,
         (end_date IS NOT NULL AND end_date < CURRENT_DATE) AS is_expired`,
      [
        title || null,
        description || null,
        eventDate || null,
        endDate || null,
        location || null,
        imageUrl || null,
        hasCustomFormSchemaInput,
        normalizedFormSchema,
        eventId,
      ]
    );

    return res.json(result.rows[0]);
  } catch (error) {
    return next(error);
  }
}

async function removeEventImage(req, res, next) {
  try {
    const { eventId } = req.params;
    const actor = req.actor;

    const existing = await pool.query(
      `SELECT id, created_by_user
       FROM events
       WHERE id = $1
       LIMIT 1`,
      [eventId]
    );

    if (!existing.rows.length) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (actor?.role === 'user' && Number(existing.rows[0].created_by_user) !== Number(actor.id)) {
      return res.status(403).json({ message: 'You can only edit your own events' });
    }

    const result = await pool.query(
      `UPDATE events
       SET image_url = NULL
       WHERE id = $1
       RETURNING id, title, description, event_date, end_date, location, image_url, event_code, feedback_form_schema, created_at,
         (end_date IS NOT NULL AND end_date < CURRENT_DATE) AS is_expired`,
      [eventId]
    );

    return res.json(result.rows[0]);
  } catch (error) {
    return next(error);
  }
}

async function deleteEvent(req, res, next) {
  try {
    const { eventId } = req.params;
    const actor = req.actor;

    const existing = await pool.query(
      `SELECT id, created_by_user
       FROM events
       WHERE id = $1
       LIMIT 1`,
      [eventId]
    );

    if (!existing.rows.length) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (actor?.role === 'user' && Number(existing.rows[0].created_by_user) !== Number(actor.id)) {
      return res.status(403).json({ message: 'You can only delete your own events' });
    }

    await pool.query('BEGIN');
    await pool.query('DELETE FROM feedback WHERE event_id = $1', [eventId]);
    try {
      await pool.query('DELETE FROM donations WHERE event_id = $1', [eventId]);
    } catch (err) {
      if (err.code !== '42P01') {
        throw err;
      }
    }
    await pool.query('DELETE FROM events WHERE id = $1', [eventId]);
    await pool.query('COMMIT');

    return res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    try {
      await pool.query('ROLLBACK');
    } catch (_) {
      // no-op
    }
    return next(error);
  }
}

async function getEventByCode(req, res, next) {
  try {
    const { eventCode } = req.params;

    const result = await pool.query(
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
       WHERE e.event_code = $1
       GROUP BY e.id
       LIMIT 1`,
      [eventCode]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (result.rows[0].is_expired) {
      return res.status(410).json({ message: 'Event hiyo imekwisha muda wake.' });
    }

    return res.json(result.rows[0]);
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

async function downloadEventCodePdf(req, res, next) {
  try {
    let PDFDocument;
    let QRCode;
    try {
      PDFDocument = require('pdfkit');
      QRCode = require('qrcode');
    } catch (depError) {
      return res.status(503).json({
        message: 'PDF feature dependencies are missing. Run: npm install pdfkit qrcode',
      });
    }

    const { eventId } = req.params;
    const actor = req.actor;

    const result = await pool.query(
      `SELECT id, title, event_code, created_by_user
       FROM events
       WHERE id = $1
       LIMIT 1`,
      [eventId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const event = result.rows[0];

    if (actor?.role === 'user' && Number(event.created_by_user) !== Number(actor.id)) {
      return res.status(403).json({ message: 'You can only download PDF for your own events' });
    }

    const qrData = `${process.env.FRONTEND_URL || 'http://localhost:4200'}?eventCode=${encodeURIComponent(event.event_code)}`;
    const qrDataUrl = await QRCode.toDataURL(qrData, { width: 260, margin: 1 });
    const qrBase64 = qrDataUrl.split(',')[1];
    const qrBuffer = Buffer.from(qrBase64, 'base64');

    const safeTitle = String(event.title || 'event').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    const filename = `${safeTitle}-${event.event_code}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const doc = new PDFDocument({ size: 'A4', margin: 48 });
    doc.pipe(res);

    doc.fontSize(24).fillColor('#14532d').text('Event Access Card', { align: 'center' });
    doc.moveDown(0.4);
    doc.fontSize(13).fillColor('#166534').text(`Event: ${event.title}`, { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(20).fillColor('#065f46').text(event.event_code, { align: 'center' });
    doc.moveDown(0.8);

    const qrSize = 220;
    const x = (doc.page.width - qrSize) / 2;
    const y = doc.y;
    doc.roundedRect(x - 14, y - 14, qrSize + 28, qrSize + 28, 12).fillAndStroke('#f0fdf4', '#bbf7d0');
    doc.image(qrBuffer, x, y, { width: qrSize, height: qrSize });
    doc.moveDown(10);

    doc.fontSize(11).fillColor('#166534').text('Scan QR code to open feedback page for this event.', { align: 'center' });
    doc.moveDown(0.4);
    doc.fontSize(9).fillColor('#4b5563').text(qrData, { align: 'center' });

    doc.end();
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getEvents,
  getPublicEventSlides,
  createEvent,
  updateEvent,
  removeEventImage,
  deleteEvent,
  getEventByCode,
  getPublicAdById,
  uploadEventImage,
  downloadEventCodePdf,
};
