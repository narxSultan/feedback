const pool = require('../config/db');

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

function normalizeText(value) {
  return String(value || '').toLowerCase().trim();
}

function tokenize(value) {
  return normalizeText(value)
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 1);
}

function computeMatchScore(message, entry) {
  const normalizedMessage = normalizeText(message);
  const messageTokens = tokenize(message);
  const title = normalizeText(entry.title);
  const keywordList = String(entry.keywords || '')
    .split(/[,\n;]/)
    .map((keyword) => keyword.trim().toLowerCase())
    .filter(Boolean);
  const keywordSet = new Set(keywordList);
  const searchSpace = `${title} ${keywordList.join(' ')}`;

  let score = 0;

  if (normalizedMessage.length > 3 && searchSpace.includes(normalizedMessage)) {
    score += 8;
  }

  for (const token of messageTokens) {
    if (keywordSet.has(token)) {
      score += 5;
      continue;
    }
    if (keywordList.some((keyword) => keyword.includes(token))) {
      score += 3;
      continue;
    }
    if (title.includes(token)) {
      score += 2;
    }
  }

  return score;
}

function getLocalizedAnswer(entry, language) {
  const wantsSwahili = String(language || '').toLowerCase() === 'sw';
  if (wantsSwahili && entry.answer_sw) {
    return entry.answer_sw;
  }
  return entry.answer_en;
}

function fallbackAnswer(language) {
  const wantsSwahili = String(language || '').toLowerCase() === 'sw';
  return wantsSwahili
    ? 'Samahani, sijapata jibu sahihi kwa swali hilo. Jaribu kuandika kwa maneno mengine au wasiliana na msimamizi.'
    : 'Sorry, I could not find a matching answer. Please rephrase your question or contact the admin.';
}

async function askChatbot(req, res, next) {
  try {
    const message = String(req.body?.message || '').trim();
    const language = String(req.body?.language || 'en').toLowerCase();

    if (!message) {
      return res.status(400).json({
        message: language === 'sw' ? 'Andika swali lako kwanza.' : 'Please enter your question first.',
      });
    }

    const entriesResult = await pool.query(
      `SELECT id, title, keywords, answer_en, answer_sw
       FROM chatbot_knowledge
       WHERE is_active = TRUE
       ORDER BY updated_at DESC, id DESC`
    );

    if (!entriesResult.rows.length) {
      return res.json({
        answer: fallbackAnswer(language),
        matched: false,
      });
    }

    let bestEntry = null;
    let bestScore = 0;

    for (const entry of entriesResult.rows) {
      const score = computeMatchScore(message, entry);
      if (score > bestScore) {
        bestScore = score;
        bestEntry = entry;
      }
    }

    if (!bestEntry || bestScore <= 0) {
      return res.json({
        answer: fallbackAnswer(language),
        matched: false,
      });
    }

    return res.json({
      answer: getLocalizedAnswer(bestEntry, language),
      matched: true,
      entryId: bestEntry.id,
      title: bestEntry.title,
    });
  } catch (error) {
    return next(error);
  }
}

async function getChatbotEntries(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT id, title, keywords, answer_en, answer_sw, is_active, created_by_admin, created_at, updated_at
       FROM chatbot_knowledge
       ORDER BY updated_at DESC, id DESC`
    );
    return res.json(result.rows);
  } catch (error) {
    return next(error);
  }
}

async function createChatbotEntry(req, res, next) {
  try {
    const title = String(req.body?.title || '').trim();
    const keywords = String(req.body?.keywords || '').trim();
    const answerEn = String(req.body?.answerEn || '').trim();
    const answerSwRaw = req.body?.answerSw;
    const answerSw = answerSwRaw === undefined || answerSwRaw === null
      ? null
      : String(answerSwRaw).trim() || null;
    const isActive = req.body?.isActive !== false;

    if (!title || !keywords || !answerEn) {
      return res.status(400).json({ message: 'title, keywords and answerEn are required' });
    }

    const adminId = await resolveAdminTableId(req);

    const result = await pool.query(
      `INSERT INTO chatbot_knowledge (title, keywords, answer_en, answer_sw, is_active, created_by_admin, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING id, title, keywords, answer_en, answer_sw, is_active, created_by_admin, created_at, updated_at`,
      [title, keywords, answerEn, answerSw, isActive, adminId || null]
    );

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    return next(error);
  }
}

async function updateChatbotEntry(req, res, next) {
  try {
    const entryId = Number(req.params.entryId);
    if (!Number.isInteger(entryId) || entryId <= 0) {
      return res.status(400).json({ message: 'Invalid chatbot entry id' });
    }

    const assignments = [];
    const values = [];

    const hasTitle = Object.prototype.hasOwnProperty.call(req.body || {}, 'title');
    const hasKeywords = Object.prototype.hasOwnProperty.call(req.body || {}, 'keywords');
    const hasAnswerEn = Object.prototype.hasOwnProperty.call(req.body || {}, 'answerEn');
    const hasAnswerSw = Object.prototype.hasOwnProperty.call(req.body || {}, 'answerSw');
    const hasIsActive = Object.prototype.hasOwnProperty.call(req.body || {}, 'isActive');

    if (hasTitle) {
      const title = String(req.body.title || '').trim();
      if (!title) {
        return res.status(400).json({ message: 'title cannot be empty' });
      }
      values.push(title);
      assignments.push(`title = $${values.length}`);
    }

    if (hasKeywords) {
      const keywords = String(req.body.keywords || '').trim();
      if (!keywords) {
        return res.status(400).json({ message: 'keywords cannot be empty' });
      }
      values.push(keywords);
      assignments.push(`keywords = $${values.length}`);
    }

    if (hasAnswerEn) {
      const answerEn = String(req.body.answerEn || '').trim();
      if (!answerEn) {
        return res.status(400).json({ message: 'answerEn cannot be empty' });
      }
      values.push(answerEn);
      assignments.push(`answer_en = $${values.length}`);
    }

    if (hasAnswerSw) {
      const answerSwRaw = req.body.answerSw;
      const answerSw = answerSwRaw === undefined || answerSwRaw === null
        ? null
        : String(answerSwRaw).trim() || null;
      values.push(answerSw);
      assignments.push(`answer_sw = $${values.length}`);
    }

    if (hasIsActive) {
      values.push(Boolean(req.body.isActive));
      assignments.push(`is_active = $${values.length}`);
    }

    if (!assignments.length) {
      return res.status(400).json({ message: 'No update fields supplied' });
    }

    assignments.push('updated_at = NOW()');

    values.push(entryId);
    const result = await pool.query(
      `UPDATE chatbot_knowledge
       SET ${assignments.join(', ')}
       WHERE id = $${values.length}
       RETURNING id, title, keywords, answer_en, answer_sw, is_active, created_by_admin, created_at, updated_at`,
      values
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: 'Chatbot entry not found' });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    return next(error);
  }
}

async function deleteChatbotEntry(req, res, next) {
  try {
    const entryId = Number(req.params.entryId);
    if (!Number.isInteger(entryId) || entryId <= 0) {
      return res.status(400).json({ message: 'Invalid chatbot entry id' });
    }

    const result = await pool.query(
      `DELETE FROM chatbot_knowledge
       WHERE id = $1
       RETURNING id`,
      [entryId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: 'Chatbot entry not found' });
    }

    return res.json({ message: 'Chatbot entry deleted successfully' });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  askChatbot,
  getChatbotEntries,
  createChatbotEntry,
  updateChatbotEntry,
  deleteChatbotEntry,
};
