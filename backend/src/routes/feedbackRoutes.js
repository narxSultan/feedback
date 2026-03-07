const express = require('express');
const { submitFeedback, getFeedbackByEvent } = require('../controllers/feedbackController');
const { authMiddleware, requireAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', submitFeedback);
router.get('/event/:eventId', authMiddleware, requireAdmin, getFeedbackByEvent);

module.exports = router;
