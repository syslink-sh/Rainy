<a id="readme-top"></a>
<br />
<div align="center">
  <a href="https://github.com/syslink-sh/rainy">
    <img src="public/icons/icon-192x192.png" alt="Logo" width="80" height="80">
  </a>

<h3 align="center">Rainy 🌦️</h3>

  <p align="center">
    A beautiful, fast, and immersive weather application that provides real-time forecasts for any city in the world.
    <br />
    <a href="https://github.com/syslink-sh/rainy"><strong>Explore the docs »</strong></a>
    <br />
    <br />
    <a href="https://rainy.syslink.dev">View Demo</a>
    &middot;
    <a href="https://github.com/syslink-sh/rainy/issues/new?labels=bug">Report Bug</a>
    &middot;
    <a href="https://github.com/syslink-sh/rainy/issues/new?labels=enhancement">Request Feature</a>
  </p>
</div>

<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
      <ul>
        <li><a href="#built-with">Built With</a></li>
      </ul>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
      </ul>
    </li>
    <li><a href="#usage">Usage</a></li>
    <li><a href="#pwa-installation">PWA Installation</a></li>
    <li><a href="#api-endpoints">API Endpoints</a></li>
    <li><a href="#roadmap">Roadmap</a></li>
    <li><a href="#contributing">Contributing</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#contact">Contact</a></li>
    <li><a href="#acknowledgments">Acknowledgments</a></li>
  </ol>
</details>

## About The Project

[![Rainy Weather App][product-screenshot]](https://rainy.syslink.dev)

Rainy is a modern weather application featuring:

* **Real-time Weather** — Current temperature, conditions, wind, humidity, pressure, and visibility
* **Live Radar** — Interactive precipitation and cloud cover radar map powered by RainViewer
* **Forecasts** — 24-hour hourly forecast and 7-day daily forecast
* **Dynamic Backgrounds** — Beautiful animated backgrounds that change based on weather and time of day
* **City Search** — Search any city worldwide with autocomplete
* **Geolocation** — Automatically detects your location on load
* **PWA Support** — Install as an app on phones and computers with offline support
* **Mobile Optimized** — Touch-friendly UI with safe area support for notched devices

<p align="right">(<a href="#readme-top">back to top</a>)</p>

### Built With

* [![Node.js][Node.js]][Node-url]
* [![Express][Express.js]][Express-url]
* [![JavaScript][JavaScript]][JavaScript-url]
* [![CSS3][CSS3]][CSS3-url]
* [![Leaflet][Leaflet]][Leaflet-url]

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Getting Started

To get a local copy up and running follow these simple steps.

### Prerequisites

* Node.js 18+
* npm
  ```sh
  npm install npm@latest -g
  ```

### Installation

1. Clone the repo
   ```sh
   git clone https://github.com/syslink-sh/rainy.git
   ```
2. Navigate to the project directory
   ```sh
   cd rainy
   ```
3. Install NPM packages
   ```sh
   npm install
   ```
4. Start the server
   ```sh
   npm start
   ```
5. Open your browser and visit `http://localhost:3005`

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Usage

### Development Mode

Run with auto-reload on file changes:
```sh
npm run dev
```

### Production Mode

```sh
NODE_ENV=production npm start
```

### Configuration

Configuration is handled via `server/config.js` and `public/js/config.js`:

**Server Config** (`server/config.js`):
| Setting | Description | Default |
|---------|-------------|---------|
| `server.port` | Server port | `3005` (dev) / `5150` (prod) |
| `server.env` | Environment | `development` |
| `cors.allowedOrigins` | CORS origins | localhost, rainy.syslink.dev |

**Frontend Config** (`public/js/config.js`):
| Setting | Description |
|---------|-------------|
| `apiBaseUrl` | API endpoint (auto-detected) |
| `defaultLocation` | Fallback location if geolocation fails |
| `map` | Map zoom and tile settings |

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## PWA Installation

### On Mobile (iOS/Android)
1. Open [rainy.syslink.dev](https://rainy.syslink.dev) in your browser
2. **iOS**: Tap the Share button → "Add to Home Screen"
3. **Android**: Tap the menu → "Add to Home Screen" or "Install app"

### On Desktop (Chrome/Edge)
1. Open [rainy.syslink.dev](https://rainy.syslink.dev)
2. Click the install icon in the address bar, or
3. Menu → "Install Rainy..."

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Health check with uptime and status |
| `GET /api/weather?lat=&lon=` | Get weather data for coordinates |
| `GET /api/search?q=` | Search cities by name |
| `GET /api/reverse-geocode?lat=&lon=` | Get city name from coordinates |

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Roadmap

- [x] Real-time weather data
- [x] Interactive radar map
- [x] Hourly and daily forecasts
- [x] PWA support with offline capabilities
- [x] Mobile responsive design
- [ ] Weather alerts and notifications
- [ ] Multiple saved locations
- [ ] Weather widgets

See the [open issues](https://github.com/syslink-sh/rainy/issues) for a full list of proposed features (and known issues).

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

If you have a suggestion that would make this better, please fork the repo and create a pull request. You can also simply open an issue with the tag "enhancement".
Don't forget to give the project a star! Thanks again!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

<p align="right">(<a href="#readme-top">back to top</a>)</p>

### Top contributors:

<a href="https://github.com/syslink-sh/rainy/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=syslink-sh/rainy" alt="contrib.rocks image" />
</a>

## License

Distributed under the ISC License. See `LICENSE` for more information.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Contact

SySLink - [@syslink_sh](https://twitter.com/syslink_sh)

Project Link: [https://github.com/syslink-sh/rainy](https://github.com/syslink-sh/rainy)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Acknowledgments

* [Open-Meteo](https://open-meteo.com/) - Free Weather API
* [RainViewer](https://www.rainviewer.com/) - Weather Radar API
* [Nominatim](https://nominatim.org/) - Geocoding Service
* [Leaflet](https://leafletjs.com/) - Interactive Maps
* [Font Awesome](https://fontawesome.com/) - Icons

<p align="right">(<a href="#readme-top">back to top</a>)</p>

[contributors-shield]: https://img.shields.io/github/contributors/syslink-sh/rainy.svg?style=for-the-badge
[contributors-url]: https://github.com/syslink-sh/rainy/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/syslink-sh/rainy.svg?style=for-the-badge
[forks-url]: https://github.com/syslink-sh/rainy/network/members
[stars-shield]: https://img.shields.io/github/stars/syslink-sh/rainy.svg?style=for-the-badge
[stars-url]: https://github.com/syslink-sh/rainy/stargazers
[issues-shield]: https://img.shields.io/github/issues/syslink-sh/rainy.svg?style=for-the-badge
[issues-url]: https://github.com/syslink-sh/rainy/issues
[license-shield]: https://img.shields.io/github/license/syslink-sh/rainy.svg?style=for-the-badge
[license-url]: https://github.com/syslink-sh/rainy/blob/main/LICENSE
[product-screenshot]: ghimages/websitescreenshot.png
[Node.js]: https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white
[Node-url]: https://nodejs.org/
[Express.js]: https://img.shields.io/badge/Express.js-404D59?style=for-the-badge&logo=express&logoColor=white
[Express-url]: https://expressjs.com/
[JavaScript]: https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black
[JavaScript-url]: https://developer.mozilla.org/en-US/docs/Web/JavaScript
[CSS3]: https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white
[CSS3-url]: https://developer.mozilla.org/en-US/docs/Web/CSS
[Leaflet]: https://img.shields.io/badge/Leaflet-199900?style=for-the-badge&logo=leaflet&logoColor=white
[Leaflet-url]: https://leafletjs.com/
