const express = require('express');
const {
  getEvents,
  getPublicEventSlides,
  createEvent,
  updateEvent,
  removeEventImage,
  deleteEvent,
  getEventByCode,
  getPublicAdById,
  uploadEventImage,
  downloadEventCodePdf,
} = require('../controllers/eventsController');
const { authMiddleware, requireAdmin } = require('../middleware/authMiddleware');
const { eventImageUpload } = require('../middleware/uploadMiddleware');

const router = express.Router();

router.get('/code/:eventCode', getEventByCode);
router.get('/ad/:adId', getPublicAdById);
router.get('/public', getPublicEventSlides);
router.get('/:eventId/code-pdf', authMiddleware, downloadEventCodePdf);
router.get('/', authMiddleware, requireAdmin, getEvents);
router.post('/', authMiddleware, requireAdmin, createEvent);
router.patch('/:eventId', authMiddleware, updateEvent);
router.patch('/:eventId/remove-image', authMiddleware, removeEventImage);
router.delete('/:eventId', authMiddleware, deleteEvent);
router.post('/upload-image', authMiddleware, requireAdmin, eventImageUpload.single('image'), uploadEventImage);

module.exports = router;
