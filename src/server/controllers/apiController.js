const path = require('path');
const fs = require('fs');
const config = require('../config');
const weatherService = require('../services/weatherService');
const searchService = require('../services/searchService');
const cacheService = require('../services/cacheService');



/**
 * Validate latitude and longitude
 */
const validateCoordinates = (lat, lon) => {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);

    if (isNaN(latitude) || isNaN(longitude)) {
        return { valid: false, error: 'Invalid coordinates' };
    }
    if (latitude < -90 || latitude > 90) {
        return { valid: false, error: 'Latitude must be between -90 and 90' };
    }
    if (longitude < -180 || longitude > 180) {
        return { valid: false, error: 'Longitude must be between -180 and 180' };
    }

    return { valid: true, latitude, longitude };
};

// Haversine distance used for finding nearest city name for display title
const toRad = (deg) => (deg * Math.PI) / 180;
const haversineKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth radius km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
        + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2))
        * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

// Helper to find city name from coordinates (uses searchService's internal list if accessible or duplicates logic?)
// SearchService has the list but it is private.
// For now, we simple rely on the coordinates or passed name.
// NOTE: Ideally we expose "findNearest" from searchService.
// Let's assume for this refactor we might lose strictly "nearest city name" resolution 
// unless we add it to searchService. 
// I will just use coordinates as name fallback or client provided name. 
// Function findNearestCityName removed to rely on client or basic coord display.

/**
 * Get weather data for coordinates
 */
exports.getWeather = async (req, res) => {
    try {
        const { lat, lon } = req.query;

        if (!lat || !lon) {
            return res.status(400).json({ error: 'missing_coordinates' });
        }

        const coords = validateCoordinates(lat, lon);
        if (!coords.valid) {
            return res.status(400).json({ error: 'invalid_coordinates', message: coords.error });
        }

        // Normalize lat/lon rounding to 4 decimal places (for display only)
        const latNorm = Math.round(coords.latitude * 10000) / 10000;
        const lonNorm = Math.round(coords.longitude * 10000) / 10000;

        const cacheKey = `weather:${latNorm}:${lonNorm}`;
        const cachedData = cacheService.get(cacheKey);
        if (cachedData) {
            if (config.debug) console.log('[Cache] Hit', cacheKey);
            return res.json(cachedData);
        }

        const weatherData = await weatherService.fetchStart(coords.latitude, coords.longitude);

        // Enrich with name: Try finding nearest city, otherwise fallback to coords
        const nearest = searchService.findNearest(coords.latitude, coords.longitude);
        const displayName = nearest ? nearest.name : `${latNorm},${lonNorm}`;

        weatherData.name = displayName;
        if (nearest && nearest.arabic) {
            // Pass arabic name in a way client understands if needed, or we rely on client mapping
            // but effectively we just want a good display name.
            // If we really want to support arabic/english switching for this ID, 
            // we might need to send both names.
            weatherData.name_ar = nearest.arabic;
        }

        cacheService.set(cacheKey, weatherData);

        res.json(weatherData);

    } catch (error) {
        if (config.debug) console.error('[Weather Error]', error.message);

        if (error.response) {
            return res.status(error.response.status).json({
                error: 'Weather service error',
                details: error.response.data,
            });
        }
        if (error.code === 'ECONNABORTED') {
            return res.status(504).json({ error: 'Weather service timeout' });
        }
        if (error.message === 'coords_out_of_bounds') {
            return res.status(400).json({ error: 'coords_out_of_bounds' });
        }

        res.status(500).json({ error: 'Failed to fetch weather data' });
    }
};

/**
 * Search for locations by name
 */
exports.searchLocation = async (req, res) => {
    try {
        const { q } = req.query;
        const locations = searchService.search(q);
        res.json(locations);
    } catch (error) {
        if (config.debug) console.error('[Search Error]', error.message);
        if (error.message.includes('must be at least')) return res.status(400).json({ error: error.message });
        res.status(500).json({ error: 'Failed to search locations' });
    }
};

/**
 * Analytics Reception
 * Logs basic event data for debugging/analysis
 */
exports.receiveAnalytics = (req, res) => {
    try {
        const payload = req.body;
        if (config.debug || process.env.NODE_ENV !== 'production') {
            console.log('[Analytics]', payload);
        }
        // Always return success to client
        res.status(200).json({ status: 'received' });
    } catch (e) {
        // Ignore analytics errors
        res.status(200).json({ status: 'ignored' });
    }
};

/**
 * Reverse geocode coordinates to location name
 */
exports.getReverseGeocode = async (req, res) => {
    try {
        const { lat, lon } = req.query;

        if (!lat || !lon) {
            return res.status(400).json({ error: 'Latitude and longitude are required' });
        }

        const coords = validateCoordinates(lat, lon);
        if (!coords.valid) {
            return res.status(400).json({ error: coords.error });
        }

        const geocodeData = await weatherService.reverseGeocode(coords.latitude, coords.longitude);
        const address = geocodeData.address || {};

        const city = address.city
            || address.town
            || address.village
            || address.municipality
            || address.county
            || address.suburb
            || 'Unknown Location';

        const country = address.country || '';
        const countryCode = address.country_code?.toUpperCase() || '';

        res.json({
            name: city,
            country,
            countryCode,
            displayName: geocodeData.display_name || city,
        });

    } catch (error) {
        if (config.debug) console.error('[Geocode Error]', error.message);
        // Return fallback instead of error for better UX; still return 200 with generic value
        res.json({ name: 'Unknown Location', country: '', countryCode: '' });
    }
};

/**
 * Calendar API: returns months mapping and current month entry
 */
exports.getCalendar = async (req, res) => {
    try {
        const filePath = path.join(process.cwd(), 'public', 'assets', 'calendar.json');
        const contents = await fs.promises.readFile(filePath, 'utf8');
        const data = JSON.parse(contents || '{}');

        const months = data.months || {};

        // Determine month - either from query month parameter (01..12) or server current month
        let monthParam = req.query.month;
        if (monthParam) {
            monthParam = String(monthParam).padStart(2, '0');
            if (!/^(0[1-9]|1[0-2])$/.test(monthParam)) {
                return res.status(400).json({ error: 'Invalid month parameter' });
            }
        } else {
            const now = new Date();
            monthParam = String(now.getMonth() + 1).padStart(2, '0');
        }

        const currentEntry = months[monthParam] || null;

        const result = {
            months,
            serverCurrentMonth: monthParam,
            currentEntry, // Backwards compatibility if needed, but client should prefer local lookup
        };

        return res.json(result);
    } catch (error) {
        if (config.debug) console.error('[Calendar API Error]', error.message);
        return res.status(500).json({ error: 'Failed to load calendar' });
    }
};