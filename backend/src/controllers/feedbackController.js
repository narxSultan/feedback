const pool = require('../config/db');

function hasNonEmptyAnswer(value, type) {
  if (type === 'checkbox') {
    return Array.isArray(value) && value.length > 0;
  }
  return String(value || '').trim().length > 0;
}

async function submitFeedback(req, res, next) {
  try {
    const { eventCode, rating, satisfaction, comment, name, email, customAnswers } = req.body;

    if (!eventCode) {
      return res.status(400).json({ message: 'eventCode is required' });
    }

    const eventResult = await pool.query(
      `SELECT
         id,
         feedback_form_schema,
         (end_date IS NOT NULL AND end_date < CURRENT_DATE) AS is_expired
       FROM events
       WHERE event_code = $1`,
      [eventCode]
    );

    if (!eventResult.rows.length) {
      return res.status(404).json({ message: 'Event not found for the provided code' });
    }

    if (eventResult.rows[0].is_expired) {
      return res.status(410).json({ message: 'Event hiyo imekwisha muda wake.' });
    }

    const eventId = eventResult.rows[0].id;
    const schema = eventResult.rows[0].feedback_form_schema;
    const hasCustomSchema = Boolean(schema && Array.isArray(schema.questions) && schema.questions.length);
    const answers = customAnswers && typeof customAnswers === 'object' ? customAnswers : {};
    let storedCustomAnswers = null;

    if (hasCustomSchema) {
      const requiredMissing = schema.questions.some((question) => {
        if (!question.required) {
          return false;
        }
        return !hasNonEmptyAnswer(answers[question.id], question.type);
      });

      if (requiredMissing) {
        return res.status(400).json({ message: 'Please answer all required custom questions' });
      }

      // Persist custom answers using question labels for easier viewing.
      storedCustomAnswers = {};
      schema.questions.forEach((question) => {
        const value = answers[question.id];
        if (!hasNonEmptyAnswer(value, question.type)) {
          return;
        }
        storedCustomAnswers[question.label] = value;
      });
    } else if (!rating || !satisfaction || !comment) {
      return res.status(400).json({
        message: 'eventCode, rating, satisfaction and comment are required',
      });
    }

    const finalRating = Number(rating) >= 1 && Number(rating) <= 5 ? Number(rating) : 5;
    const finalSatisfaction = String(satisfaction || (hasCustomSchema ? 'Custom' : '')).trim() || 'Custom';
    const finalComment = String(comment || (hasCustomSchema ? 'Custom form response submitted' : '')).trim();

    if (!finalComment) {
      return res.status(400).json({ message: 'comment is required' });
    }

    const result = await pool.query(
      `INSERT INTO feedback (event_id, rating, satisfaction, comment, name, email, custom_answers)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, event_id, rating, satisfaction, comment, name, email, custom_answers, created_at`,
      [eventId, finalRating, finalSatisfaction, finalComment, name || null, email || null, storedCustomAnswers]
    );

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    return next(error);
  }
}

async function getFeedbackByEvent(req, res, next) {
  try {
    const { eventId } = req.params;

    const result = await pool.query(
      `SELECT f.id, f.event_id, f.rating, f.satisfaction, f.comment, f.name, f.email, f.custom_answers, f.created_at
       FROM feedback f
       WHERE f.event_id = $1
       ORDER BY f.created_at DESC`,
      [eventId]
    );

    return res.json(result.rows);
  } catch (error) {
    return next(error);
  }
}

module.exports = { submitFeedback, getFeedbackByEvent };
