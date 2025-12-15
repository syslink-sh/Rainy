const express = require('express');
const router = express.Router();
const apiController = require('../controllers/apiController');
const privacyController = require('../controllers/privacyController');



// Weather data
router.get('/weather', apiController.getWeather);

// Location search
router.get('/search', apiController.searchLocation);

// Reverse geocoding
router.get('/reverse-geocode', apiController.getReverseGeocode);

// Analytics endpoint
router.post('/analytics', apiController.receiveAnalytics);

// Calendar endpoint
router.get('/calendar', apiController.getCalendar);

// Privacy policy endpoint
router.get('/privacypolicy', privacyController.getPrivacyPolicy);

// Prayer times endpoint
router.get('/prayertimes', apiController.getPrayerTimes);

// 404 handler for unknown API routes
router.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `API endpoint ${req.method} ${req.originalUrl} does not exist`
    });
});

module.exports = router;
