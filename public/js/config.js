// Frontend Configuration
const config = {
    // API Base URL - always relative to current origin
    apiBaseUrl: '/api',

    // Default location (fallback if geolocation fails)
    defaultLocation: {
        lat: 40.7128,
        lon: -74.0060,
        city: 'New York',
        country: 'United States',
    },

    // Search settings
    searchDebounce: 150,
    searchMinLength: 2,

    // Map settings
    map: {
        defaultZoom: 6,
        minZoom: 3,
        maxZoom: 12,
        tileLayer: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    },

    // UI settings
    ui: {
        loaderTimeout: 500,
        errorToastDuration: 3000,
        hoverPopupDelay: 600,
    },
};

// Make it available globally
window.appConfig = config;

// Debug logging in development
if (window.location.hostname === 'localhost') {
    console.log('🌦️ Rainy Config:', config);
}
