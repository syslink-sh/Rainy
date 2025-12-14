// Frontend Configuration for Saudi Weather
// All settings are documented for clarity and maintainability
const config = {
    // API Base URL - always relative to current origin
    apiBaseUrl: '/api',

    // Default location (used if geolocation fails)
    defaultLocation: {
        lat: 24.69999996,
        lon: 46.73333003,
        city: 'Riyadh',
        country: 'Saudi Arabia',
        // Arabic localization
        ar: 'الرياض',
        country_ar: 'المملكة العربية السعودية',
    },

    // Fallback location constant (alias for clarity)
    DEFAULT_FALLBACK_LOCATION: {
        lat: 24.69999996,
        lon: 46.73333003,
        name: 'Riyadh',
        ar: 'الرياض'
    },

    // Saudi Arabia geographic bounds used for client-side validation
    SAUDI_BOUNDS: {
        minLat: 16.0,
        maxLat: 32.5,
        minLon: 34.0,
        maxLon: 56.5
    },

    // Feature flags and UI strings
    ENABLE_OFFLINE_WEATHER_CACHE: false,

    // Display name used when falling back to Riyadh
    FALLBACK_LOCATION: {
        lat: 24.7136,
        lon: 46.6753,
        displayName: 'Riyadh',
        arDisplayName: 'الرياض'
    },

    // Offline UI messages by locale
    OFFLINE_UI_MESSAGE: {
        en: 'No internet',
        ar: 'لا يوجد اتصال بالإنترنت'
    },
    // Location error messages (user-friendly, localized)
    LOCATION_MESSAGES: {
        denied: {
            en: "We couldn't access your location. Showing weather for Riyadh.",
            ar: 'لم يتم السماح بالوصول إلى موقعك. يتم عرض حالة الطقس في الرياض.'
        },
        unavailable: {
            en: "We couldn't determine your location. Showing weather for Riyadh.",
            ar: 'تعذر تحديد موقعك. يتم عرض حالة الطقس في الرياض.'
        },
        outOfBounds: {
            en: "This service is only available in Saudi Arabia. Showing weather for Riyadh.",
            ar: 'هذه الخدمة متاحة فقط في المملكة العربية السعودية. يتم عرض حالة الطقس في الرياض.'
        }
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
