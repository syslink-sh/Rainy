const axios = require('axios');
const config = require('../config');

// Cache helper: prefer Redis when available, fallback to in-memory Map
const { createClient } = require('redis');
const Cache = new Map();
let redisClient = null;
(async () => {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) return; // no redis configured
    try {
        redisClient = createClient({ url: redisUrl });
        redisClient.on('error', (err) => { if (config.debug) console.warn('[Redis] Error', err); });
        await redisClient.connect();
        if (config.debug) console.log('[Redis] Connected');
    } catch (e) {
        if (config.debug) console.warn('[Redis] Connection failed, falling back to in-memory cache', e.message || e);
        redisClient = null;
    }
})();

async function getCached(key) {
    if (redisClient && redisClient.isOpen) {
        try {
            const v = await redisClient.get(key);
            if (v) return JSON.parse(v);
        } catch (e) {
            // fall through to in-memory
        }
    }
    const rec = Cache.get(key);
    if (!rec) return null;
    if (Date.now() > rec.expires) {
        Cache.delete(key);
        return null;
    }
    return rec.value;
}

async function setCached(key, value, ttlSeconds) {
    if (redisClient && redisClient.isOpen) {
        try {
            await redisClient.set(key, JSON.stringify(value), { EX: ttlSeconds });
            return;
        } catch (e) {
            // fall back to memory
        }
    }
    Cache.set(key, { value, expires: Date.now() + (ttlSeconds * 1000) });
}

// Weather code descriptions
const WEATHER_CODES = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Fog',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    56: 'Light freezing drizzle',
    57: 'Dense freezing drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    66: 'Light freezing rain',
    67: 'Heavy freezing rain',
    71: 'Slight snow fall',
    73: 'Moderate snow fall',
    75: 'Heavy snow fall',
    77: 'Snow grains',
    80: 'Slight rain showers',
    81: 'Moderate rain showers',
    82: 'Violent rain showers',
    85: 'Slight snow showers',
    86: 'Heavy snow showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with slight hail',
    99: 'Thunderstorm with heavy hail',
};

// Axios instance with defaults
const http = axios.create({
    timeout: 10000,
    headers: {
        // generic UA; avoid including personal emails or secrets
        'User-Agent': process.env.HTTP_USER_AGENT || 'SaudiWeather/1.0',
        'Accept': 'application/json, text/plain, */*'
    },
});

/**
 * Health check endpoint
 */
exports.getHealth = (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: Math.round(process.uptime()),
        environment: config.server.env,
    });
};

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

/**
 * Safely retrieve a value from an hourly array at index `idx`.
 * Returns `null` when the array is missing or the index is out of range.
 * Options:
 *  - round: '1d' => one decimal, 'int' => integer, null => no rounding
 *  - defaultValue: value to return when missing (default: null)
 */
const getHourlyValue = (arr, idx, options = {}) => {
    const { round = null, defaultValue = null } = options || {};
    if (!arr || typeof idx !== 'number' || idx < 0 || typeof arr[idx] === 'undefined' || arr[idx] === null) return defaultValue;
    const v = arr[idx];
    if (round === '1d') return Math.round(v * 10) / 10;
    if (round === 'int') return Math.round(v);
    return v;
};

/**
 * Get weather data for coordinates
 */
exports.getWeather = async (req, res) => {
    try {
        const { lat, lon } = req.query;

        if (!lat || !lon) {
            return res.status(400).json({ error: 'Latitude and longitude are required' });
        }

        const coords = validateCoordinates(lat, lon);
        if (!coords.valid) {
            return res.status(400).json({ error: coords.error });
        }

        // Lock to Saudi Arabia bounds
        if (coords.latitude < 16 || coords.latitude > 32 || coords.longitude < 34 || coords.longitude > 56) {
            return res.status(400).json({ error: 'Weather data is only available for locations within Saudi Arabia' });
        }

        // Normalize lat/lon rounding to 4 decimal places to reduce cache fragmentation
        const latNorm = Math.round(coords.latitude * 10000) / 10000;
        const lonNorm = Math.round(coords.longitude * 10000) / 10000;
        // caching key
        const cacheKey = `weather:${latNorm}:${lonNorm}`;
        const cached = await getCached(cacheKey);
        if (cached) return res.json(cached);

        // Use Open-Meteo standard params: request hourly fields and current_weather
        const url = `${config.apis.openMeteo}/forecast`;
        const params = {
            latitude: coords.latitude,
            longitude: coords.longitude,
            hourly: 'temperature_2m,weathercode',
            daily: 'weathercode,temperature_2m_max,temperature_2m_min,sunrise,sunset',
            timezone: 'auto',
            forecast_days: 7,
            current_weather: true,
        };

        const response = await http.get(url, { params });
        const data = response.data;
        const current = data.current_weather || {};
        const hourly = data.hourly || {};
        const daily = data.daily || {};

        // determine nearest hourly index for current time
        let idx = -1;
        if (current.time && Array.isArray(hourly.time)) {
            idx = hourly.time.indexOf(current.time);
            if (idx === -1) {
                // fallback: find closest timestamp
                const currentTs = new Date(current.time).getTime();
                let best = Infinity;
                hourly.time.forEach((t, i) => {
                    const d = Math.abs(new Date(t).getTime() - currentTs);
                    if (d < best) { best = d; idx = i; }
                });
            }
        }

        const weatherDescription = WEATHER_CODES[current.weathercode] || (Array.isArray(daily.weathercode) ? WEATHER_CODES[daily.weathercode[0]] || 'Unknown' : 'Unknown');

        const mappedData = {
            name: 'Current Location',
            dt: current.time || (hourly.time && hourly.time[0]) || null,
            is_day: typeof current.is_day !== 'undefined' ? current.is_day : null,
            timezone: data.timezone,
            main: {
                temp: (typeof current.temperature !== 'undefined') ? Math.round(current.temperature * 10) / 10 : getHourlyValue(hourly.temperature_2m, idx, { round: '1d' }),
            },
            weather: [{
                description: weatherDescription,
                code: current.weathercode || (hourly.weathercode && hourly.weathercode[idx]) || null,
            }],
            hourly: {
                time: hourly.time ? hourly.time.slice(0, 24) : [],
                temperature_2m: hourly.temperature_2m ? hourly.temperature_2m.slice(0, 24) : [],
                weather_code: hourly.weathercode ? hourly.weathercode.slice(0, 24) : [],
            },
            daily: {
                time: daily.time || [],
                weather_code: daily.weathercode || [],
                temperature_2m_max: daily.temperature_2m_max || [],
                temperature_2m_min: daily.temperature_2m_min || [],
                sunrise: daily.sunrise || [],
                sunset: daily.sunset || [],
            },
        };

        await setCached(cacheKey, mappedData, config.cache.weather);
        res.json(mappedData);

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

        res.status(500).json({ error: 'Failed to fetch weather data' });
    }
};

/**
 * Search for locations by name
 */
// Preload the Saudi cities dataset once on module init for performance (async load)
const fs = require('fs');
const path = require('path');
let SAUDI_CITIES = [];
(async () => {
    try {
        const citiesPath = path.join(process.cwd(), 'public', 'assets', 'saudi_cities.json');
        const citiesData = await fs.promises.readFile(citiesPath, 'utf8');
        SAUDI_CITIES = JSON.parse(citiesData);
        if (config.debug) console.log('[Cities] Loaded', SAUDI_CITIES.length, 'cities');
    } catch (e) {
        if (config.debug) console.warn('[Cities] Could not load cities list', e.message || e);
        SAUDI_CITIES = [];
    }
})();

// Normalize string (strip diacritics, lowercase)
const normalize = (s) => {
    if (!s) return '';
    try {
        return s.normalize ? s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase() : s.toLowerCase();
    } catch (e) {
        return String(s).toLowerCase();
    }
};

exports.searchLocation = async (req, res) => {
    try {
        const { q } = req.query;

        if (!q || q.trim().length < 2) {
            return res.status(400).json({ error: 'Search query must be at least 2 characters' });
        }
        // Limit query length to prevent abuse
        if (q.trim().length > 64) return res.status(400).json({ error: 'Search query too long' });

        // Filter cities using preloaded normalized list
        const query = q.trim();
        const normalizedQuery = normalize(query);
        const filtered = SAUDI_CITIES.filter(city => {
            const en = normalize(city.name_en);
            const ar = normalize(city.name_ar);
            return en.includes(normalizedQuery) || ar.includes(normalizedQuery);
        }).slice(0, 10);

        // Map to expected format
        const locations = filtered.map(city => ({
            name: city.name_en,
            lat: city.center[0],
            lon: city.center[1],
            country: 'Saudi Arabia',
            region: '',
            arabic: city.name_ar
        }));

        res.json(locations);

    } catch (error) {
        if (config.debug) console.error('[Search Error]', error.message);
        res.status(500).json({ error: 'Failed to search locations' });
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

        const url = `${config.apis.nominatim}/reverse`;
        const params = {
            format: 'json',
            lat: coords.latitude,
            lon: coords.longitude,
            zoom: 10,
            addressdetails: 1,
        };

        const response = await http.get(url, { params });
        const data = response.data;
        const address = data.address || {};

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
            displayName: data.display_name || city,
        });

    } catch (error) {
        if (config.debug) console.error('[Geocode Error]', error.message);
        // Return fallback instead of error for better UX; still return 200 with generic value
        res.json({ name: 'Unknown Location', country: '', countryCode: '' });
    }
};
// Calendar API: returns months mapping and current month entry
exports.getCalendar = async (req, res) => {
    try {
        const cacheKey = 'calendar:v1';
        const cached = await getCached(cacheKey);
        if (cached) return res.json(cached);

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
            currentMonth: monthParam,
            currentEntry,
        };

        await setCached(cacheKey, result, config.cache.geocode || 86400);
        return res.json(result);
    } catch (error) {
        if (config.debug) console.error('[Calendar API Error]', error.message);
        return res.status(500).json({ error: 'Failed to load calendar' });
    }
};