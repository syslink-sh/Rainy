const fs = require('fs');
const path = require('path');
const config = require('../config');

let SAUDI_CITIES = [];

// Preload cities
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

const normalize = (s) => {
    if (!s) return '';
    try {
        return s.normalize ? s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase() : s.toLowerCase();
    } catch (e) {
        return String(s).toLowerCase();
    }
};

exports.search = (query) => {
    if (!query || query.trim().length < 2) {
        throw new Error('Search query must be at least 2 characters');
    }
    if (query.trim().length > 64) {
        throw new Error('Search query too long');
    }

    const q = query.trim();
    const normalizedQuery = normalize(q);

    const filtered = SAUDI_CITIES.filter(city => {
        const en = normalize(city.name_en);
        const ar = normalize(city.name_ar);
        return en.includes(normalizedQuery) || ar.includes(normalizedQuery);
    }).slice(0, 10);

    return filtered.map(city => ({
        name: city.name_en,
        lat: city.center[0],
        lon: city.center[1],
        country: 'Saudi Arabia',
        region: '',
        arabic: city.name_ar
    }));
};

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

exports.findNearest = (lat, lon) => {
    try {
        if (!Array.isArray(SAUDI_CITIES) || SAUDI_CITIES.length === 0) return null;
        let best = null;
        let bestDist = Infinity;
        // Optimization: rough bounds check or just loop all (4k is small enough for V8)
        for (const city of SAUDI_CITIES) {
            const center = city && city.center;
            if (!center) continue;
            const d = haversineKm(lat, lon, center[0], center[1]);
            if (d < bestDist) {
                bestDist = d;
                best = city;
            }
        }
        // Return match if within reasonable distance (e.g. 50km) or just closest
        if (best && bestDist < 100) {
            return {
                name: best.name_en,
                arabic: best.name_ar,
                dist: bestDist
            };
        }
        return null;
    } catch (e) {
        if (config.debug) console.error('[Search] FindNearest failed', e);
        return null;
    }
};
