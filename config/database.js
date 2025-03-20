import pkg from 'pg';  // Correct for CommonJS modules
const { Pool } = pkg;

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "feedback",
  password: "4242",
  port: 5432,
});

export { pool };