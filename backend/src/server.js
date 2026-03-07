require('dotenv').config();
const app = require('./app');
const pool = require('./config/db');

const port = process.env.PORT || 5000;

async function start() {
  try {
    await pool.query('SELECT 1');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(120) NOT NULL,
        email VARCHAR(120) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        organization VARCHAR(180),
        role VARCHAR(20) NOT NULL DEFAULT 'user',
        profile_image_url TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user'");
    await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image_url TEXT");
    await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_hash TEXT");
    await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires_at TIMESTAMP");
    await pool.query("ALTER TABLE admins ADD COLUMN IF NOT EXISTS profile_image_url TEXT");
    await pool.query('ALTER TABLE events ADD COLUMN IF NOT EXISTS image_url TEXT');
    await pool.query('ALTER TABLE events ADD COLUMN IF NOT EXISTS end_date DATE');
    await pool.query('ALTER TABLE events ADD COLUMN IF NOT EXISTS created_by_user INTEGER REFERENCES users(id) ON DELETE SET NULL');
    await pool.query("ALTER TABLE events ADD COLUMN IF NOT EXISTS feedback_form_schema JSONB");
    await pool.query("ALTER TABLE feedback ADD COLUMN IF NOT EXISTS custom_answers JSONB");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_payments (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        payment_type VARCHAR(20) NOT NULL CHECK (payment_type IN ('subscription', 'donation')),
        amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
        status VARCHAR(20) NOT NULL DEFAULT 'paid',
        note TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_activities (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        activity_type VARCHAR(80) NOT NULL,
        meta JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ad_slides (
        id SERIAL PRIMARY KEY,
        title VARCHAR(180),
        description TEXT,
        image_url TEXT NOT NULL,
        target_url TEXT,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_by_admin INTEGER REFERENCES admins(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query("ALTER TABLE ad_slides ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE");
    await pool.query("ALTER TABLE ad_slides ADD COLUMN IF NOT EXISTS description TEXT");
    await pool.query("ALTER TABLE ad_slides ADD COLUMN IF NOT EXISTS end_date DATE");
    app.listen(port, () => {
      console.log(`Backend running on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to connect to database:', error.message);
    process.exit(1);
  }
}

start();
