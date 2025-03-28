import express from "express";
import { pool } from '../config/database.js';
import { protectAdmin } from '../middleware/authMiddleware.js';
import {
  getFeedback,
  addFeedback,
  replyFeedback,
  deleteFeedback,
  getFeedbackStats,
} from "../controllers/feedbackController.js";

const router = express.Router();

router.get("/", getFeedback);
router.post("/", addFeedback);
router.put("/:id/reply", replyFeedback);
router.delete("/:id", deleteFeedback);
router.get('/dashboard', protectAdmin, getFeedbackStats);
router.get("/feedback-stats", getFeedbackStats);
router.get('/stats', getFeedbackStats);


// POST route for submitting feedback
router.post('/feedback', async (req, res) => {
  try {
    const { email, phone, description } = req.body;
    const query = 'INSERT INTO feedback (email, phone, description) VALUES ($1, $2, $3) RETURNING *';
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
    const repliedFeedbackQuery = 'SELECT COUNT(*) AS replied FROM feedback WHERE reply IS NOT NULL';
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



// ✅ Route to get feedback count
router.get('/feedback-count', async (req, res) => {
  try {
    const result = await pool.query('SELECT COUNT(*) AS total FROM feedback');  // Correcting to 'feedback' table
    res.json({ count: result.rows[0].total });
  } catch (error) {
    console.error('Error fetching feedback count:', error);
    res.status(500).json({ message: 'Server error' });
  }
});



export default router;