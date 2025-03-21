import express from "express";
import { pool } from '../config/database.js';
import {
  getFeedback,
  addFeedback,
  replyFeedback,
  deleteFeedback,
} from "../controllers/feedbackController.js";

const router = express.Router();

router.get("/", getFeedback);
router.post("/", addFeedback);
router.put("/:id/reply", replyFeedback);
router.delete("/:id", deleteFeedback);


// POST route for submitting feedback
router.post('/feedbacks', async (req, res) => {
  try {
    const { email, phone, description } = req.body;
    const query = 'INSERT INTO feedbacks (email, phone, description) VALUES ($1, $2, $3) RETURNING *';
    const result = await pool.query(query, [email, phone, description]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API to get feedback statistics
router.get('/stats', async (req, res) => {
  try {
    const totalFeedbackQuery = 'SELECT COUNT(*) AS total FROM feedback';
    const repliedFeedbackQuery = 'SELECT COUNT(*) AS replied FROM feedback WHERE is_replied = true';
    const latestFeedbackQuery = 'SELECT description FROM feedback ORDER BY created_at DESC LIMIT 1';

    const totalFeedbackResult = await pool.query(totalFeedbackQuery);
    const repliedFeedbackResult = await pool.query(repliedFeedbackQuery);
    const latestFeedbackResult = await pool.query(latestFeedbackQuery);

    res.json({
      totalFeedback: totalFeedbackResult.rows[0].total,
      repliedFeedback: repliedFeedbackResult.rows[0].replied,
      latestFeedback: latestFeedbackResult.rows.length > 0 ? latestFeedbackResult.rows[0].description : ''
    });
  } catch (error) {
    console.error('Error fetching feedback stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
export default router;