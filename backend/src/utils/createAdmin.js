require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('../config/db');

async function run() {
  const [name, email, password] = process.argv.slice(2);

  if (!name || !email || !password) {
    console.error('Usage: node src/utils/createAdmin.js "Admin Name" "admin@email.com" "password"');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const result = await pool.query(
    `INSERT INTO admins (name, email, password_hash)
     VALUES ($1, $2, $3)
     ON CONFLICT (email)
     DO UPDATE SET name = EXCLUDED.name, password_hash = EXCLUDED.password_hash
     RETURNING id, name, email`,
    [name, email, passwordHash]
  );

  console.log('Admin ready:', result.rows[0]);
  await pool.end();
}

run().catch(async (error) => {
  console.error('Failed to create admin:', error.message);
  await pool.end();
  process.exit(1);
});
