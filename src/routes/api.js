const express = require('express');
const router = express.Router();
const apiController = require('../controllers/apiController');

// Define routes
router.get('/health', apiController.getHealth);
router.get('/weather', apiController.getWeather);

module.exports = router;
