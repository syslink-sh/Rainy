const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const config = require('./config');

const app = express();
const PORT = config.server.port;
const isProduction = config.server.env === 'production';

// CORS configuration
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, curl, same-origin, etc.)
        if (!origin) return callback(null, true);
        
        if (config.cors.allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.warn(`CORS blocked origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
};

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com", "https://cdnjs.cloudflare.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "blob:", "https:"],
            connectSrc: ["'self'", "https://unpkg.com", "https://api.rainviewer.com", "https://api.open-meteo.com", "https://geocoding-api.open-meteo.com", "https://nominatim.openstreetmap.org", "https://*.tile.openstreetmap.org", "https://*.rainviewer.com"],
            fontSrc: ["'self'", "https://cdnjs.cloudflare.com", "data:"],
            workerSrc: ["'self'", "blob:"],
        },
    },
    crossOriginEmbedderPolicy: false,
}));

app.use(cors(corsOptions));
app.use(morgan(isProduction ? 'combined' : 'dev'));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// API routes
const apiRoutes = require('./routes/api');
app.use('/api', apiRoutes);

// Serve static files from public directory
const publicPath = path.join(__dirname, '..', 'public');
app.use(express.static(publicPath, {
    maxAge: isProduction ? '1d' : 0,
    etag: true,
}));

// SPA fallback - serve index.html for all non-API routes
app.get('*', (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
    console.error(`[Error] ${err.message}`);
    res.status(err.status || 500).json({
        error: isProduction ? 'Internal Server Error' : err.message,
    });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    process.exit(0);
});

app.listen(PORT, () => {
    console.log(`🌦️  Rainy Server running at http://localhost:${PORT}`);
    console.log(`   Environment: ${config.server.env}`);
    console.log(`   Static files: ${publicPath}`);
});

module.exports = app;