const express = require('express');
const adminRoutes = require('./adminRoutes');
const eventRoutes = require('./eventRoutes');
const feedbackRoutes = require('./feedbackRoutes');
const donationRoutes = require('./donationRoutes');
const userRoutes = require('./userRoutes');
const chatbotRoutes = require('./chatbotRoutes');

const router = express.Router();

router.use('/admin', adminRoutes);
router.use('/events', eventRoutes);
router.use('/feedback', feedbackRoutes);
router.use('/donate', donationRoutes);
router.use('/users', userRoutes);
router.use('/chatbot', chatbotRoutes);

module.exports = router;
