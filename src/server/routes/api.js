const express = require('express');
const router = express.Router();
const apiController = require('../controllers/apiController');

// Health check
router.get('/health', apiController.getHealth);

// Weather data
router.get('/weather', apiController.getWeather);

// Location search
router.get('/search', apiController.searchLocation);

// Reverse geocoding
router.get('/reverse-geocode', apiController.getReverseGeocode);

// 404 handler for unknown API routes
router.use((req, res) => {
    res.status(404).json({ 
        error: 'Not Found', 
        message: `API endpoint ${req.method} ${req.originalUrl} does not exist` 
    });
});

module.exports = router;
