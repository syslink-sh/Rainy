// Storage Keys
const LOC_KEY = 'saudi_weather_last_loc';

export const getLastLocationFromStorage = () => {
    try {
        const stored = localStorage.getItem(LOC_KEY);
        if (stored) return JSON.parse(stored);
    } catch (e) { console.error('Storage read error', e); }
    return null;
};

export const saveLastLocation = (lat, lon, name) => {
    try {
        const data = { lat, lon, name, timestamp: Date.now() };
        localStorage.setItem(LOC_KEY, JSON.stringify(data));
    } catch (e) { console.error('Storage write error', e); }
};

export const isValidCoords = (lat, lon) => {
    const b = window.appConfig?.SAUDI_BOUNDS;
    if (!b) return true;
    return lat >= b.minLat && lat <= b.maxLat && lon >= b.minLon && lon <= b.maxLon;
};

export const parseLatLonFromUrl = () => {
    try {
        const qs = window.location.search;
        if (!qs) return null;
        const params = new URLSearchParams(qs);
        const lat = parseFloat(params.get('lat'));
        const lon = parseFloat(params.get('lon'));
        if (Number.isFinite(lat) && Number.isFinite(lon) && isValidCoords(lat, lon)) {
            return { lat, lon };
        }
    } catch (e) { /* ignore */ }
    return null;
};

export const updateUrlForLocation = (lat, lon) => {
    try {
        const url = new URL(window.location.href);
        url.searchParams.set('lat', String(lat));
        url.searchParams.set('lon', String(lon));
        history.replaceState({}, '', url.toString());
    } catch (e) { /* ignore */ }
};

export const geolocateWithTimeout = (timeoutMs = 6000) => new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Geolocation not supported'));
    let settled = false;
    const onSuccess = (position) => {
        if (settled) return;
        settled = true;
        resolve({ lat: position.coords.latitude, lon: position.coords.longitude });
    };
    const onError = (err) => {
        if (settled) return;
        settled = true;
        reject(err);
    };
    navigator.geolocation.getCurrentPosition(onSuccess, onError, { enableHighAccuracy: true, maximumAge: 0, timeout: timeoutMs });
    setTimeout(() => {
        if (settled) return;
        settled = true;
        reject(new Error('Geolocation timeout'));
    }, timeoutMs + 50);
});
