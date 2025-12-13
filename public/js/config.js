// Frontend Configuration for Saudi Weather
// All settings are documented for clarity and maintainability
const config = {
    // API Base URL - always relative to current origin
    apiBaseUrl: '/api',

    // Default location (used if geolocation fails)
    defaultLocation: {
        lat: 24.7136,
        lon: 46.6753,
        city: 'Riyadh',
        country: 'Saudi Arabia',
    },

    // Search settings
    searchDebounce: 150, // ms debounce for search input
    searchMinLength: 2,  // minimum characters to trigger search

    // Map settings
    map: {
        defaultZoom: 6,
        minZoom: 3,
        maxZoom: 12,
        tileLayer: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    },

    // UI settings
    ui: {
        loaderTimeout: 500,         // ms for loader fade
        errorToastDuration: 3000,   // ms error toast display
        hoverPopupDelay: 600,       // ms delay for map hover popup
    },
    // Disable verbose logging in production. Set to true for debugging.
    debug: false,
};

// Make config available globally
window.appConfig = config;
// Debug logging only when explicitly enabled in config
if (config.debug) {
    console.log('🌦️ Saudi Weather Config:', config);
}
