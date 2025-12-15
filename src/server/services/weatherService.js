const axios = require('axios');
const config = require('../config');

// Weather code descriptions
const WEATHER_CODES = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    10: 'Fog',
    11: 'Depositing rime fog',
    12: 'Light drizzle',
    13: 'Moderate drizzle',
    14: 'Dense drizzle',
    15: 'Light freezing drizzle',
    16: 'Dense freezing drizzle',
    17: 'Slight rain',
    18: 'Moderate rain',
    19: 'Heavy rain',
    20: 'Light freezing rain',
    21: 'Heavy freezing rain',
    22: 'Slight snow fall',
    23: 'Moderate snow fall',
    24: 'Heavy snow fall',
    25: 'Snow grains',
    26: 'Slight rain showers',
    27: 'Moderate rain showers',
    28: 'Violent rain showers',
    29: 'Slight snow showers',
    30: 'Heavy snow showers',
    31: 'Thunderstorm',
    32: 'Thunderstorm with slight hail',
    33: 'Thunderstorm with heavy hail',
};

const http = axios.create({
    timeout: 10000,
    headers: {
        'User-Agent': process.env.HTTP_USER_AGENT || 'SaudiWeather/1.0',
        'Accept': 'application/json, text/plain, */*'
    },
});

const getHourlyValue = (arr, idx, options = {}) => {
    const { round = null, defaultValue = null } = options || {};
    if (!arr || typeof idx !== 'number' || idx < 0 || typeof arr[idx] === 'undefined' || arr[idx] === null) return defaultValue;
    const v = arr[idx];
    if (round === '1d') return Math.round(v * 10) / 10;
    if (round === 'int') return Math.round(v);
    return v;
};

// Haversine / Nearest City Logic
const toRad = (deg) => (deg * Math.PI) / 180;
const haversineKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
        + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2))
        * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

exports.fetchStart = async (lat, lon) => {
    // Lock to Saudi Arabia bounds
    const b = config.SAUDI_BOUNDS || { minLat: 16, maxLat: 32, minLon: 34, maxLon: 56 };
    if (lat < b.minLat || lat > b.maxLat || lon < b.minLon || lon > b.maxLon) {
        throw new Error('coords_out_of_bounds');
    }

    const url = `${config.apis.openMeteo}/forecast`;
    const params = {
        latitude: lat,
        longitude: lon,
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

    let idx = -1;
    if (current.time && Array.isArray(hourly.time)) {
        idx = hourly.time.indexOf(current.time);
        if (idx === -1) {
            const currentTs = new Date(current.time).getTime();
            let best = Infinity;
            hourly.time.forEach((t, i) => {
                const d = Math.abs(new Date(t).getTime() - currentTs);
                if (d < best) { best = d; idx = i; }
            });
        }
    }

    const weatherCode = current.weathercode;
    const weatherDesc = WEATHER_CODES[weatherCode] || 'Unknown';

    return {
        // Name will be handled by controller or passed in
        dt: current.time || (hourly.time && hourly.time[0]),
        is_day: current.is_day,
        timezone: data.timezone,
        main: {
            temp: (typeof current.temperature !== 'undefined') ? Math.round(current.temperature * 10) / 10 : getHourlyValue(hourly.temperature_2m, idx, { round: '1d' }),
        },
        weather: [{
            description: weatherDesc,
            code: weatherCode,
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
};

exports.reverseGeocode = async (lat, lon) => {
    const url = `${config.apis.nominatim}/reverse`;
    const params = {
        format: 'json',
        lat,
        lon,
        zoom: 10,
        addressdetails: 1,
    };
    try {
        const response = await http.get(url, { params });
        return response.data;
    } catch (e) {
        throw new Error('Geocode failed');
    }
};

exports.getPrayerTimes = async (lat, lon) => {
    // Current date in DD-MM-YYYY format
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const dateStr = `${day}-${month}-${year}`;

    const url = `http://api.aladhan.com/v1/timings/${dateStr}`;
    const params = {
        latitude: lat,
        longitude: lon,
        method: 3, // Muslim World League
        iso8601: 'false' // Return HH:MM format
    };

    try {
        const response = await http.get(url, { params });
        return response.data;
    } catch (e) {
        throw new Error('Prayer times fetch failed');
    }
};
