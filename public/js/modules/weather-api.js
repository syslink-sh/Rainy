export const fetchWeatherData = async (lat, lon) => {
    const apiBase = window.appConfig?.apiBaseUrl || '/api';
    const response = await fetch(`${apiBase}/weather?lat=${lat}&lon=${lon}`);
    if (!response.ok) throw new Error('Weather data unavailable');
    return await response.json();
};

export const searchLocations = async (query, signal) => {
    const apiBase = window.appConfig?.apiBaseUrl || '/api';
    const response = await fetch(`${apiBase}/search?q=${encodeURIComponent(query)}`, { signal });
    if (!response.ok) throw new Error('Search failed');
    return await response.json();
};

export const reverseGeocode = async (lat, lon) => {
    const apiBase = window.appConfig?.apiBaseUrl || '/api';
    const response = await fetch(`${apiBase}/reverse-geocode?lat=${lat}&lon=${lon}`);
    if (!response.ok) throw new Error('Geocode failed');
    return await response.json();
}

export const fetchPrayerTimes = async (lat, lon) => {
    const apiBase = window.appConfig?.apiBaseUrl || '/api';
    const response = await fetch(`${apiBase}/prayertimes?lat=${lat}&lon=${lon}`);
    if (!response.ok) throw new Error('Prayer times unavailable');
    return await response.json();
};

export const sendAnalytics = (event, data = {}) => {
    try {
        const payload = JSON.stringify({ event, ...data, ts: Date.now() });
        if (navigator.sendBeacon) {
            navigator.sendBeacon('/api/analytics', payload);
        } else if (window.fetch) {
            fetch('/api/analytics', { method: 'POST', body: payload, keepalive: true }).catch(() => { });
        }
    } catch (e) { }
};
