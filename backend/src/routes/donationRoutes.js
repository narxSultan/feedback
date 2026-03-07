const express = require('express');
const { donate } = require('../controllers/donationController');

const router = express.Router();

router.post('/', donate);

module.exports = router;
