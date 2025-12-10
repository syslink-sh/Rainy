const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const config = require('./config');

const app = express();
const PORT = config.server.port;

// CORS configuration for separate frontend hosting
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) return callback(null, true);
        
        if (config.cors.allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
};

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "https://unpkg.com"],
            styleSrc: ["'self'", "https://unpkg.com", "https://cdnjs.cloudflare.com", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https://*.tile.openstreetmap.org", "https://*.rainviewer.com"],
            connectSrc: ["'self'", "https://api.rainviewer.com"],
            fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
        },
    },
}));
app.use(cors(corsOptions));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes only - frontend is served separately
const apiRoutes = require('./routes/api');
app.use('/api', apiRoutes);

// Health check endpoint
app.get('/', (req, res) => {
    res.json({ status: 'ok', message: 'Rainy API Server' });
});

app.listen(PORT, () => {
    console.log(`API Server is running on http://localhost:${PORT}`);
});

module.exports = app;