import pkg from 'pg'; 
const { Pool } = pkg;
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "feedback",
  password: "4242",
  port: 5432,
});

export { pool };