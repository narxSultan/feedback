const express = require('express');
const { registerUser, loginUser, forgotPassword, resetPassword } = require('../controllers/userAuthController');
const {
  getUserDashboard,
  createUserEvent,
  createPayment,
  deletePayment,
  clearPaymentHistory,
  getEventFeedback,
  getFeedbackHistory,
  getMyProfile,
  updateMyProfile,
  changeMyPassword,
  uploadEventImage,
  uploadProfileImage,
} = require('../controllers/userController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { eventImageUpload, profileImageUpload } = require('../middleware/uploadMiddleware');

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/dashboard', authMiddleware, getUserDashboard);
router.post('/events', authMiddleware, createUserEvent);
router.post('/payments', authMiddleware, createPayment);
router.delete('/payments/:paymentId', authMiddleware, deletePayment);
router.delete('/payments', authMiddleware, clearPaymentHistory);
router.get('/events/:eventId/feedback', authMiddleware, getEventFeedback);
router.get('/feedback-history', authMiddleware, getFeedbackHistory);
router.get('/me', authMiddleware, getMyProfile);
router.put('/me', authMiddleware, updateMyProfile);
router.patch('/change-password', authMiddleware, changeMyPassword);
router.post('/upload-event-image', authMiddleware, eventImageUpload.single('image'), uploadEventImage);
router.post('/upload-profile-image', authMiddleware, profileImageUpload.single('image'), uploadProfileImage);

module.exports = router;
