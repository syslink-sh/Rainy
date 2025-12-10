# Rainy -- Server

This directory contains the **API-only** backend for Rainy. The server does not serve the frontend website - the `public/` folder must be hosted separately (e.g., via Nginx, Apache, Cloudflare Pages, or any static file host).

## Structure

- `server.js`: The main entry point for the Express server.
- `config.js`: Server configuration (ports, CORS, rate limiting).
- `controllers/`: Contains logic for handling API requests (fetching data from Open-Meteo, RainViewer, etc.).
- `routes/`: Defines the API endpoints.

## Configuration

Edit `config.js` to customize the server:

```javascript
module.exports = {
    server: {
        port: 3005,  // Development: 3005, Production: 5150
    },
    cors: {
        allowedOrigins: [
            'http://localhost:3005',
            'https://rainy.syslink.dev',
            // Add your frontend domain here
        ],
    },
};
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3005 (dev) / 5150 (prod) |
| `NODE_ENV` | Environment mode | development |
| `ALLOWED_ORIGINS` | Comma-separated list of allowed CORS origins | localhost, rainy.syslink.dev |

## API Endpoints

- `GET /api/weather?lat={lat}&lon={lon}`: Fetches current weather, forecast, and background info.
- `GET /api/search?q={query}`: Searches for cities.
- `GET /api/reverse-geocode?lat={lat}&lon={lon}`: Gets city name from coordinates.

## Setup

The server requires Node.js. Dependencies are managed in the root `package.json`.

To start the server (from the root directory):
```bash
npm start
```
