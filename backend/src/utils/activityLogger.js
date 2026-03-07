const pool = require('../config/db');

async function logUserActivity(userId, activityType, meta = {}) {
  await pool.query(
    `INSERT INTO user_activities (user_id, activity_type, meta)
     VALUES ($1, $2, $3)`,
    [userId, activityType, JSON.stringify(meta)]
  );
}

module.exports = { logUserActivity };
