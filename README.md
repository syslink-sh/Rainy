<a name="readme-top"></a>

<p align="center">
  <a href="https://saudiweather.syslink.dev"><strong>Saudi Weather</strong></a>
  <br/>
  <small>The best weather app in Saudi Arabia, with updated forecasts and accurate weather.</small>
</p>


## Overview

Saudi Weather is the best weather app in Saudi Arabia, with updated forecasts and accurate weather.

- Author: SySLink
- Homepage: https://saudiweather.syslink.dev
- Repository: https://github.com/syslink-sh/saudi-weather

## Highlights

- Weather
- Accurate Forecasts
- Radar Map
- Features from over 1000 apps into one app

## Built With

- Node.js (>=18)

## API Endpoints (For Developers)

- `GET /api/health`
  - Healthcheck and server info
- `GET /api/weather?lat={lat}&lon={lon}`
  - Returns weather summary, current conditions, hourly and daily arrays. Lat/lon must be within Saudi Arabia bounds
- `GET /api/search?q={query}`
  - Search for city names; supports Arabic and English
- `GET /api/reverse-geocode?lat={lat}&lon={lon}`
  - Returns a nearby city or 'Unknown Location' for coordinates


## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Optional: Redis for caching

### Installation

```sh
git clone https://github.com/syslink-sh/saudi-weather.git
cd saudi-weather
npm install
```

### Running Locally

```sh
# start the server
npm start

# Run a basic healthcheck test (requires server running locally)
npm test
```

Server configuration is in [src/server/config.js](src/server/config.js).

## Frontend

- The frontend SPA is under `/public` and served by the Express server. Arabic localized pages are available under `/public/ar/`.
- City dataset used by the client and server is at [public/assets/saudi_cities.json](public/assets/saudi_cities.json).

## Security and Deployment Notes

- CSP headers are computed to allow only hashed inline scripts.
- HSTS and rate limiting are enabled; ensure production configuration is set and origins are restricted.
- Use HTTPS and a managed Redis (optional) for production caching.

## Scripts

- `npm start` — run the Node server
- `npm test` — run the lightweight healthcheck

## Contributing

Contributions are welcome. Please fork the repo and file a PR with changes.

## License

Licensed under ISC — see LICENSE in the repo.

## Contact

- Email: me@syslink.dev
- Author: SySLink (https://github.com/syslink-sh)
- Issues: https://github.com/syslink-sh/saudi-weather/issues

<p align="right">(<a href="#readme-top">back to top</a>)</p><!-- MARKDOWN LINKS & IMAGES -->