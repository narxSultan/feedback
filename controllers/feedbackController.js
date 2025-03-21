import { pool } from "../config/database.js";  // Use import for ES modules

// Get all feedback
export const getFeedback = async (req, res) => {
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