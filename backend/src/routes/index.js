const express = require('express');
const adminRoutes = require('./adminRoutes');
const eventRoutes = require('./eventRoutes');
const feedbackRoutes = require('./feedbackRoutes');
const donationRoutes = require('./donationRoutes');
const userRoutes = require('./userRoutes');

const router = express.Router();

router.use('/admin', adminRoutes);
router.use('/events', eventRoutes);
router.use('/feedback', feedbackRoutes);
router.use('/donate', donationRoutes);
router.use('/users', userRoutes);

module.exports = router;
