const express = require('express');
const {
  loginAdmin,
  getUsers,
  getMyProfile,
  updateMyProfile,
  uploadAdminProfileImage,
  getAds,
  createAd,
  updateAd,
  deleteAd,
  uploadAdImage,
  getUserActivities,
  getPublicFeedback,
  updateUserRole,
  resetUserPassword,
  changeAdminPassword,
} = require('../controllers/adminController');
const {
  getChatbotEntries,
  createChatbotEntry,
  updateChatbotEntry,
  deleteChatbotEntry,
} = require('../controllers/chatbotController');
const { authMiddleware, requireAdmin } = require('../middleware/authMiddleware');
const { profileImageUpload, eventImageUpload } = require('../middleware/uploadMiddleware');

const router = express.Router();

router.post('/login', loginAdmin);
router.get('/me', authMiddleware, requireAdmin, getMyProfile);
router.put('/me', authMiddleware, requireAdmin, updateMyProfile);
router.post('/upload-profile-image', authMiddleware, requireAdmin, profileImageUpload.single('image'), uploadAdminProfileImage);
router.get('/ads', authMiddleware, requireAdmin, getAds);
router.post('/ads', authMiddleware, requireAdmin, createAd);
router.patch('/ads/:adId', authMiddleware, requireAdmin, updateAd);
router.delete('/ads/:adId', authMiddleware, requireAdmin, deleteAd);
router.post('/ads/upload-image', authMiddleware, requireAdmin, eventImageUpload.single('image'), uploadAdImage);
router.get('/users', authMiddleware, requireAdmin, getUsers);
router.patch('/users/:userId/role', authMiddleware, requireAdmin, updateUserRole);
router.patch('/users/:userId/reset-password', authMiddleware, requireAdmin, resetUserPassword);
router.patch('/change-password', authMiddleware, requireAdmin, changeAdminPassword);
router.get('/activities', authMiddleware, requireAdmin, getUserActivities);
router.get('/public-feedback', authMiddleware, requireAdmin, getPublicFeedback);
router.get('/chatbot', authMiddleware, requireAdmin, getChatbotEntries);
router.post('/chatbot', authMiddleware, requireAdmin, createChatbotEntry);
router.patch('/chatbot/:entryId', authMiddleware, requireAdmin, updateChatbotEntry);
router.delete('/chatbot/:entryId', authMiddleware, requireAdmin, deleteChatbotEntry);

module.exports = router;
