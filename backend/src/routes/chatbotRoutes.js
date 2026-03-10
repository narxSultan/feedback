const express = require('express');
const { askChatbot } = require('../controllers/chatbotController');

const router = express.Router();

router.post('/ask', askChatbot);

module.exports = router;
