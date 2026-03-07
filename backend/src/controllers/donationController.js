const pool = require('../config/db');

async function donate(req, res, next) {
  try {
    const { eventCode, amount, name, email, note } = req.body;

    if (!amount) {
      return res.status(400).json({ message: 'Donation amount is required' });
    }

    let eventId = null;
    if (eventCode) {
      const eventResult = await pool.query(
        `SELECT id, (end_date IS NOT NULL AND end_date < CURRENT_DATE) AS is_expired
         FROM events
         WHERE event_code = $1`,
        [eventCode]
      );
      if (!eventResult.rows.length) {
        return res.status(404).json({ message: 'Event not found for provided code' });
      }
      if (eventResult.rows[0].is_expired) {
        return res.status(410).json({ message: 'Event hiyo imekwisha muda wake.' });
      }
      eventId = eventResult.rows[0].id;
    }

    const result = await pool.query(
      `INSERT INTO donations (event_id, amount, name, email, note)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, event_id, amount, name, email, note, created_at`,
      [eventId, amount, name || null, email || null, note || null]
    );

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    return next(error);
  }
}

module.exports = { donate };
