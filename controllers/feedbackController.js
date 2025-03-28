import express from 'express';  // Ensure express is imported
import { pool } from "../config/database.js";  // Import pool only once
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Get all feedback
export const getFeedback = async (_req, res) => {
  try {
    const result = await pool.query("SELECT * FROM feedback ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Add new feedback
export const addFeedback = async (req, res) => {
  const { email, phone, description } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO feedback (email, phone, description) VALUES ($1, $2, $3) RETURNING *",
      [email, phone, description]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Reply to feedback
export const replyFeedback = async (req, res) => {
  const { id } = req.params;
  const { reply } = req.body;
  try {
    const result = await pool.query(
      "UPDATE feedback SET reply = $1 WHERE id = $2 RETURNING *",
      [reply, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete feedback
export const deleteFeedback = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM feedback WHERE id = $1", [id]);
    res.json({ message: "Feedback deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Admin login
export const adminLogin = async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    // Check if user exists
    if (result.rows.length === 0) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const user = result.rows[0];

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Check if the user is an admin
    if (user.role !== 'admin') {
      return res.status(403).json({ message: "Access denied, admin only" });
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user.id, email: user.email }, 'your_secret_key', { expiresIn: '1h' });

    res.json({ message: "Login successful", token });
  } catch (error) {
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

// Removed duplicate declaration of getFeedbackStats

// Endpoint to get feedback statistics
export const getFeedbackStats = async (_req, res) => {
  try {
    const totalFeedback = await pool.query("SELECT COUNT(*) FROM feedback");
    const repliedFeedback = await pool.query("SELECT COUNT(*) FROM feedback WHERE reply IS NOT NULL");
    const latestFeedback = await pool.query("SELECT * FROM feedback ORDER BY created_at DESC LIMIT 1");

    res.json({
      totalFeedback: totalFeedback.rows[0].count,
      repliedFeedback: repliedFeedback.rows[0].count,
      latestFeedback: latestFeedback.rows[0] || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
