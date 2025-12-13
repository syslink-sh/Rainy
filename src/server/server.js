const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const morgan = require('morgan');
const config = require('./config');

const app = express();
const PORT = config.server.port;
const isProduction = config.server.env === 'production';

const log = (...args) => { if (config.debug) console.log(...args); };
const warn = (...args) => { if (config.debug) console.warn(...args); };
const errlog = (...args) => { console.error(...args); };

// CORS configuration
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, curl, same-origin, etc.)
        if (!origin) return callback(null, true);
        if (config.cors.allowedOrigins.includes(origin)) return callback(null, true);
        warn(`CORS blocked origin: ${origin}`);
        // Explicitly deny the origin but don't throw a stack trace that leaks internals
        return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
};

// Security middleware
// Disable helmet's CSP handling here; we'll compute a stricter CSP header below
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
// Additional secure headers and strict transport on production
if (isProduction) {
    app.set('trust proxy', 1);
    // Enforce HSTS for production (1 year + preload)
    try {
        app.use(helmet.hsts({ maxAge: 31536000, includeSubDomains: true, preload: true }));
    } catch (e) {
        // ignore if HSTS isn't available in this environment
    }
}

// Compute SHA256 hashes for inline scripts in the HTML files so we can allow them without 'unsafe-inline'
const computeInlineScriptHashes = () => {
    const files = [
        path.join(__dirname, '..', '..', 'public', 'index.html'),
        path.join(__dirname, '..', '..', 'public', 'ar', 'index.html')
    ];
    const hashes = new Set();
    // Match <script> tags without a src attribute robustly
    const scriptRe = /<script\b(?=[^>]*>)(?![^>]*\bsrc\s*=)[^>]*>([\s\S]*?)<\/script>/gi;
    for (const file of files) {
        try {
            const content = fs.readFileSync(file, 'utf8');
            let m;
            while ((m = scriptRe.exec(content)) !== null) {
                const script = m[1].trim();
                if (!script) continue;
                const hash = crypto.createHash('sha256').update(script, 'utf8').digest('base64');
                hashes.add(`'sha256-${hash}'`);
            }
        } catch (e) {
            // ignore missing files
        }
    }
    return Array.from(hashes);
};

const inlineScriptHashes = computeInlineScriptHashes();

// CSP middleware that includes computed script hashes and avoids 'unsafe-inline' for scripts
app.use((req, res, next) => {
    const scriptSrc = ["'self'", ...inlineScriptHashes, 'https://unpkg.com', 'https://cdnjs.cloudflare.com'];
    const styleSrc = ["'self'", "'unsafe-inline'", 'https://unpkg.com', 'https://cdnjs.cloudflare.com'];
    const connectSrc = ["'self'", 'https://api.rainviewer.com', 'https://api.open-meteo.com', 'https://geocoding-api.open-meteo.com', 'https://nominatim.openstreetmap.org', 'https://*.tile.openstreetmap.org', 'https://*.rainviewer.com'];

    const directives = [
        `default-src 'self'`,
        // Don't use 'unsafe-inline' for scripts; we compute and allow only hashed inline scripts
        `script-src ${scriptSrc.join(' ')}`,
        `style-src 'self' 'unsafe-inline' https://unpkg.com https://cdnjs.cloudflare.com`,
        `img-src 'self' data: blob: https:`,
        `connect-src 'self' https://api.rainviewer.com https://api.open-meteo.com https://geocoding-api.open-meteo.com https://nominatim.openstreetmap.org https://*.tile.openstreetmap.org https://*.rainviewer.com https://cdnjs.cloudflare.com`,
        `font-src 'self' https://cdnjs.cloudflare.com data:`,
        `frame-src 'self' https://www.yanbuweather.com`,
        `worker-src 'self' blob:`
    ];

    // Use a strict CSP header
    res.setHeader('Content-Security-Policy', directives.join('; '));
    // Prevent MIME sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // Referrer policy
    res.setHeader('Referrer-Policy', 'no-referrer-when-downgrade');
    // Permissions policy - minimal set for web app
    res.setHeader('Permissions-Policy', 'geolocation=(self)');
    next();
});

app.use(cors(corsOptions));
app.use(morgan(isProduction ? 'combined' : 'dev'));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// API routes
const apiRoutes = require('./routes/api');
// Use express-rate-limit for production-safe rate limiting
const rateLimit = require('express-rate-limit');
const apiLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs || 15 * 60 * 1000,
    max: config.rateLimit.maxRequests || 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests' },
});

app.use('/api', apiLimiter, apiRoutes);

// Serve static files from public directory (project root `/public`)
const publicPath = path.join(__dirname, '..', '..', 'public');
app.use(express.static(publicPath, {
    maxAge: isProduction ? '1d' : 0,
    etag: true,
}));

// SPA fallback - serve index.html for all non-API routes
// Serve index.html for navigational requests (SPA fallback). Ignore requests for other resource types.
app.get('*', (req, res, next) => {
    const accept = req.headers.accept || '';
    if (!accept.includes('text/html')) return next();
    const indexPath = path.join(publicPath, 'index.html');
    res.sendFile(indexPath, (err) => {
        if (err) {
            errlog(`[Static Serve Error] Failed to send ${indexPath}: ${err.message}`);
            return next(err);
        }
    });
});

// Global error handler
app.use((err, req, res, next) => {
    // Log stacktrace in debug only
    if (config.debug) {
        errlog(`[Error] ${err.stack || err.message}`);
    } else {
        errlog(`[Error] ${err.message}`);
    }
    res.status(err.status || 500).json({
        error: isProduction ? 'Internal Server Error' : err.message,
    });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    log('SIGTERM received, shutting down gracefully...');
    process.exit(0);
});

app.listen(PORT, () => {
    log(`🌦️  Saudi Weather Server running at http://localhost:${PORT}`);
    log(`   Environment: ${config.server.env}`);
    log(`   Static files: ${publicPath}`);
});

module.exports = app;
