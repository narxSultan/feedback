const crypto = require('crypto');
const pool = require('../config/db');

const SESSION_IDLE_MINUTES = Number(process.env.SESSION_IDLE_MINUTES) || 20;
const SESSION_IDLE_TIMEOUT_MS = SESSION_IDLE_MINUTES * 60 * 1000;

async function invalidateSessions(accountType, accountId) {
  const column = accountType === 'user' ? 'user_id' : 'admin_id';
  await pool.query(
    `DELETE FROM sessions
     WHERE account_type = $1
       AND ${column} = $2`,
    [accountType, accountId]
  );
}

async function createSession({ accountType, accountId, deviceInfo }) {
  if (!['user', 'admin'].includes(accountType)) {
    throw new Error('Invalid account type for session creation');
  }

  await invalidateSessions(accountType, accountId);
  const sessionId = crypto.randomUUID();
  const now = new Date();

  await pool.query(
    `INSERT INTO sessions (session_id, account_type, user_id, admin_id, device_info, last_activity)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      sessionId,
      accountType,
      accountType === 'user' ? accountId : null,
      accountType === 'admin' ? accountId : null,
      deviceInfo || null,
      now
    ]
  );

  return sessionId;
}

async function getSessionById(sessionId) {
  const result = await pool.query('SELECT * FROM sessions WHERE session_id = $1', [sessionId]);
  return result.rows[0] || null;
}

async function refreshSession(sessionId) {
  const result = await pool.query(
    'UPDATE sessions SET last_activity = NOW() WHERE session_id = $1 RETURNING *',
    [sessionId]
  );
  return result.rows[0] || null;
}

async function deleteSession(sessionId) {
  await pool.query('DELETE FROM sessions WHERE session_id = $1', [sessionId]);
}

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      id SERIAL PRIMARY KEY,
      session_id UUID UNIQUE NOT NULL,
      account_type VARCHAR(10) NOT NULL CHECK (account_type IN ('user','admin')),
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      admin_id INTEGER REFERENCES admins(id) ON DELETE CASCADE,
      device_info TEXT,
      last_activity TIMESTAMP NOT NULL DEFAULT NOW(),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
}

ensureTable().catch(() => {});

module.exports = {
  createSession,
  getSessionById,
  refreshSession,
  deleteSession,
  SESSION_IDLE_TIMEOUT_MS
};
