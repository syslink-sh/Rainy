const config = require('../config');

// Simple in-memory cache
const cache = new Map();
const CACHE_TTL = (config.cache ? config.cache.weather : 300) * 1000; // ms

exports.get = (key) => {
    const item = cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiry) {
        cache.delete(key);
        return null;
    }
    return item.data;
};

exports.set = (key, data) => {
    cache.set(key, {
        data,
        expiry: Date.now() + CACHE_TTL
    });
};

exports.clear = () => {
    cache.clear();
};
