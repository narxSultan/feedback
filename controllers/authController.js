import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pkg from "pg";

dotenv.config();
const { Pool } = pkg;

const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "feedback",
  password: process.env.DB_PASSWORD || "4242",
  port: process.env.DB_PORT || 5432,
});

const secretKey = process.env.JWT_SECRET || "supersecretkey";

// **Register User**
export const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role",
      [name, email, hashedPassword, role || "user"]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// **Login User**
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

    if (user.rows.length === 0) return res.status(401).json({ error: "Invalid email or password" });

    const validPassword = await bcrypt.compare(password, user.rows[0].password);
    if (!validPassword) {return res.status(401).json({ error: "Invalid email or password" });
  }


  const token = jwt.sign(
    { role: user.rows[0].role },
    secretKey, 
    { expiresIn: "1h" }
  );
  
  res.json({
    token,
    user: { 
      name: user.rows[0].name, 
      email: user.rows[0].email, 
      role: user.rows[0].role 
    }
  });

  res.json({
    token: token, // Send the token
    user: {
      name: user.rows[0].name, 
      email: user.rows[0].email, 
      role: user.rows[0].role
    }
  });
  
  
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// **Get All Users (Admin Only)**
export const getUsers = async (req, res) => {
  try {
    const users = await pool.query("SELECT id, name, email, role, created_at FROM users");
    res.json(users.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// **Delete User (Admin Only)**
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM users WHERE id = $1", [id]);
    res.json({ message: "User deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// **Extra Test Function**
export const loginUser = (req, res) => {
  res.send("Login successful!");
};