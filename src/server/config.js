const env = process.env.NODE_ENV || 'development';
const isProduction = env === 'production';

module.exports = {
    // Server Configuration
    server: {
        port: parseInt(process.env.PORT, 10) || (isProduction ? 5150 : 3005),
        env,
        isProduction,
    },

    // CORS Configuration
    cors: {
        allowedOrigins: process.env.ALLOWED_ORIGINS 
            ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(s => s && s.length > 0)
            : [
                'http://localhost:3005',
                'http://localhost:5150',
                'http://127.0.0.1:3005',
                'http://127.0.0.1:5150',
                'https://saudiweather.syslink.dev'
            ],
    },

    // External API URLs
    apis: {
        openMeteo: 'https://api.open-meteo.com/v1',
        openMeteoGeocoding: 'https://geocoding-api.open-meteo.com/v1',
        rainViewer: 'https://api.rainviewer.com',
        nominatim: 'https://nominatim.openstreetmap.org',
    },

    // Rate Limiting
    rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 100,
    },

    // Debugging flag (set DEBUG=true to enable verbose logs in development)
    debug: process.env.DEBUG === 'true' || env !== 'production',

    // Cache settings (in seconds)
    cache: {
        weather: 300,      // 5 minutes
        search: 3600,      // 1 hour
        geocode: 86400,    // 24 hours
    },
};
