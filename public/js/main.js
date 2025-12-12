document.addEventListener('DOMContentLoaded', () => {
    // Determine locale from the page language attribute
    const userLang = document.documentElement.lang || 'en';
    const locale = userLang.startsWith('ar') ? 'ar-EG' : 'en-US';
    const isArabic = userLang.startsWith('ar');

    // Localized unit labels
    const units = {
        wind: isArabic ? 'كم/س' : 'km/h',
        humidity: '%',
        feelsLike: isArabic ? '°' : '°',
        pressure: isArabic ? 'هكتوباسكال' : 'hPa',
        visibility: isArabic ? 'كم' : 'km',
        precipitation: isArabic ? 'مم' : 'mm'
    };

    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    const searchResultsEl = document.getElementById('search-results');
    const cityNameEl = document.getElementById('city-name');
    const countryNameEl = document.getElementById('country-name');
    const currentTimeEl = document.getElementById('current-time');
    const dateDisplayEl = document.getElementById('date-display');
    const tempEl = document.getElementById('temp');
    const descriptionEl = document.getElementById('description');
    const windSpeedEl = document.getElementById('wind-speed');
    const humidityEl = document.getElementById('humidity');
    const feelsLikeEl = document.getElementById('feels-like');
    const pressureEl = document.getElementById('pressure');
    const visibilityEl = document.getElementById('visibility');
    const precipitationEl = document.getElementById('precipitation');
    const weatherBg = document.getElementById('weather-bg');
    const errorToast = document.getElementById('error-toast');
    const globalLoader = document.getElementById('global-loader');
    const iconContainer = document.getElementById('weather-icon-container');
    const hourlyForecastEl = document.getElementById('hourly-forecast');
    const dailyForecastEl = document.getElementById('daily-forecast');

    let searchTimeout;
    let currentLat = null;
    let currentLon = null;
    let currentCityName = null;

    // Register for periodic sync and setup online/offline handlers
    // Improves offline experience and keeps weather data fresh
    const setupServiceWorkerCommunication = async () => {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            // Listen for messages from service worker
            navigator.serviceWorker.addEventListener('message', (event) => {
                if (event.data && event.data.type === 'PERIODIC_SYNC') {
                    if (window.appConfig?.debug) console.log('[Rainy] Weather data refreshed automatically.');
                    if (currentLat && currentLon) {
                        fetchWeather(currentLat, currentLon, currentCityName, true);
                    }
                }
                if (event.data && event.data.type === 'CACHE_REFRESHED') {
                    if (window.appConfig?.debug) console.log('[Rainy] Cache updated for offline use.');
                }
            });

            // Register periodic sync if supported
            if ('periodicSync' in navigator.serviceWorker.registration) {
                try {
                    await navigator.serviceWorker.ready;
                    const registration = await navigator.serviceWorker.getRegistration();
                    const status = await navigator.permissions.query({
                        name: 'periodic-background-sync',
                    });
                    if (status.state === 'granted') {
                        await registration.periodicSync.register('weather-periodic-sync', {
                            minInterval: 60 * 60 * 1000, // 1 hour
                        });
                            if (window.appConfig?.debug) console.log('[Rainy] Periodic sync registered.');
                    }
                } catch (error) {
                    if (window.appConfig?.debug) console.log('[Rainy] Periodic sync registration failed:', error);
                }
            }
        }
    };

    // Handle online/offline status changes
    // Improves user feedback and cache refresh
    const setupConnectivityListeners = () => {
        window.addEventListener('online', () => {
            if (window.appConfig?.debug) console.log('[Rainy] You are back online. Weather data will be refreshed.');
            if (navigator.serviceWorker && navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({
                    type: 'ONLINE_STATUS_CHANGED',
                    isOnline: true
                });
            }
            // Also refresh weather data
            if (currentLat && currentLon) {
                fetchWeather(currentLat, currentLon, currentCityName, true);
            }
        });

        window.addEventListener('offline', () => {
            if (window.appConfig?.debug) console.log('[Rainy] You are offline. Cached data will be shown.');
            showError(isArabic ? 'أنت غير متصل بالإنترنت. عرض بيانات مخزنة مؤقتًا.' : 'You are offline. Cached weather data is displayed.');
        });
    };

    // Initialize service worker communication
    setupServiceWorkerCommunication();
    setupConnectivityListeners();

    const getWeatherIconClass = (code) => {
        if (code === 0 || code === 1) return 'fa-sun';
        if (code === 2) return 'fa-cloud-sun';
        if (code === 3) return 'fa-cloud';
        if (code >= 45 && code <= 48) return 'fa-smog';
        if (code >= 51 && code <= 67) return 'fa-cloud-rain';
        if (code >= 71 && code <= 77) return 'fa-snowflake';
        if (code >= 80 && code <= 82) return 'fa-cloud-showers-heavy';
        if (code >= 85 && code <= 86) return 'fa-snowflake';
        if (code >= 95 && code <= 99) return 'fa-bolt';
        return 'fa-cloud';
    };

    const renderHourlyForecast = (hourly) => {
        hourlyForecastEl.innerHTML = '';
        const now = new Date();
        const currentHour = now.getHours();

        hourly.time.forEach((timeStr, index) => {
            const time = new Date(timeStr);
            const hour = time.getHours();
            
            // Only show future hours (or current)
            if (index < 24) {
                const div = document.createElement('div');
                div.className = 'hourly-item';
                div.innerHTML = `
                    <span class="time">${hour}:00</span>
                    <i class="fas ${getWeatherIconClass(hourly.weather_code[index])} icon"></i>
                    <span class="temp">${Math.round(hourly.temperature_2m[index])}</span>
                `;
                hourlyForecastEl.appendChild(div);
            }
        });
    };

    const renderDailyForecast = (daily) => {
        dailyForecastEl.innerHTML = '';
        
        daily.time.forEach((timeStr, index) => {
            const date = new Date(timeStr);
            const dayName = date.toLocaleDateString(locale, { weekday: 'long' });
            const todayLabel = locale.startsWith('ar') ? 'اليوم' : 'Today';

            const div = document.createElement('div');
            div.className = 'daily-item';
            div.innerHTML = `
                <span class="day">${index === 0 ? todayLabel : dayName}</span>
                <div class="icon"><i class="fas ${getWeatherIconClass(daily.weather_code[index])}"></i></div>
                <div class="temps">
                    <span class="max">${Math.round(daily.temperature_2m_max[index])}</span>
                    <span class="min">${Math.round(daily.temperature_2m_min[index])}</span>
                </div>
            `;
            dailyForecastEl.appendChild(div);
        });
    };

    const getIconSVG = (description, isDay) => {
        const desc = description ? description.toLowerCase() : '';
        const isNight = isDay === 0;
        
        // Common gradients and filters
        const defs = `
            <defs>
                <linearGradient id="sunGradient" x1="48" y1="18" x2="48" y2="54" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stop-color="#FFD700" />
                    <stop offset="100%" stop-color="#FFA500" />
                </linearGradient>
                <linearGradient id="cloudGradient" x1="48" y1="32" x2="48" y2="76" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.98" />
                    <stop offset="100%" stop-color="#F0F4F8" stop-opacity="0.95" />
                </linearGradient>
                <linearGradient id="rainGradient" x1="48" y1="32" x2="48" y2="76" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stop-color="#cbd5e1" />
                    <stop offset="100%" stop-color="#94a3b8" />
                </linearGradient>
                <linearGradient id="moonGradient" x1="48" y1="18" x2="48" y2="54" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stop-color="#E8E8E8" />
                    <stop offset="100%" stop-color="#C0C0C0" />
                </linearGradient>
                <filter id="sunBlur" x="25" y="1" width="70" height="70" filterUnits="userSpaceOnUse">
                    <feGaussianBlur stdDeviation="4" result="blur"/>
                    <feColorMatrix in="blur" type="matrix" values="0 0 0 0 1  0 0 0 0 0.647  0 0 0 0 0  0 0 0 0.4 0"/>
                    <feBlend mode="normal" in2="SourceGraphic"/>
                </filter>
                <filter id="cloudShadow" x="0" y="0" width="96" height="96" filterUnits="userSpaceOnUse">
                    <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#334155" flood-opacity="0.2"/>
                </filter>
            </defs>
        `;

        const sunGroup = `
            <g filter="url(#sunBlur)">
                <g stroke="#FFA500" stroke-width="3" stroke-linecap="round">
                    <line x1="48" y1="12" x2="48" y2="6" />
                    <line x1="48" y1="60" x2="48" y2="66" />
                    <line x1="24" y1="36" x2="18" y2="36" />
                    <line x1="72" y1="36" x2="78" y2="36" />
                    <line x1="31" y1="19" x2="27" y2="15" />
                    <line x1="65" y1="19" x2="69" y2="15" />
                    <line x1="31" y1="53" x2="27" y2="57" />
                    <line x1="65" y1="53" x2="69" y2="57" />
                </g>
                <circle cx="48" cy="36" r="18" fill="url(#sunGradient)" />
            </g>
        `;

        const moonGroup = `
            <g>
                <circle cx="48" cy="36" r="20" fill="url(#moonGradient)" />
                <circle cx="58" cy="32" r="16" fill="#141e30" />
                <g fill="rgba(255,255,255,0.8)">
                    <circle cx="20" cy="20" r="1.5" />
                    <circle cx="75" cy="15" r="1" />
                    <circle cx="80" cy="55" r="1.5" />
                    <circle cx="15" cy="60" r="1" />
                    <circle cx="30" cy="70" r="1.2" />
                    <circle cx="70" cy="70" r="1" />
                </g>
            </g>
        `;

        const cloudPath = `
            <path d="M28 76C19.1634 76 12 68.8366 12 60C12 51.1634 19.1634 44 28 44C28.5 44 29.5 44.1 30.5 44.2C32.1 37.6 39.5 32 48 32C57.5 32 65.5 38.5 67.5 46.5C67.8 46.5 68.2 46.5 68.5 46.5C76.5 46.5 83 53 83 61C83 69 76.5 76 68.5 76H28Z" 
                  fill="url(#cloudGradient)" 
                  stroke="#FFFFFF" 
                  stroke-width="1"
            />
        `;

        const darkCloudPath = `
            <path d="M28 76C19.1634 76 12 68.8366 12 60C12 51.1634 19.1634 44 28 44C28.5 44 29.5 44.1 30.5 44.2C32.1 37.6 39.5 32 48 32C57.5 32 65.5 38.5 67.5 46.5C67.8 46.5 68.2 46.5 68.5 46.5C76.5 46.5 83 53 83 61C83 69 76.5 76 68.5 76H28Z" 
                  fill="url(#rainGradient)" 
                  stroke="#94a3b8" 
                  stroke-width="1"
            />
        `;

        const rainDrops = `
            <g stroke="#60A5FA" stroke-width="3" stroke-linecap="round">
                <line x1="36" y1="80" x2="32" y2="88" />
                <line x1="48" y1="80" x2="44" y2="88" />
                <line x1="60" y1="80" x2="56" y2="88" />
            </g>
        `;

        const snowFlakes = `
            <g fill="#FFFFFF">
                <circle cx="36" cy="84" r="2" />
                <circle cx="48" cy="84" r="2" />
                <circle cx="60" cy="84" r="2" />
                <circle cx="42" cy="92" r="2" />
                <circle cx="54" cy="92" r="2" />
            </g>
        `;

        const lightning = `
            <path d="M48 88L54 76H46L52 64" stroke="#F59E0B" stroke-width="3" stroke-linejoin="round" fill="none"/>
        `;

        let content = '';

        if (desc.includes('rain') || desc.includes('drizzle')) {
            content = `<g filter="url(#cloudShadow)">${darkCloudPath}${rainDrops}</g>`;
        } else if (desc.includes('thunder')) {
            content = `<g filter="url(#cloudShadow)">${darkCloudPath}${lightning}</g>`;
        } else if (desc.includes('snow')) {
            content = `<g filter="url(#cloudShadow)">${cloudPath}${snowFlakes}</g>`;
        } else if (desc.includes('cloud') || desc.includes('overcast') || desc.includes('fog')) {
            content = `<g filter="url(#cloudShadow)">${cloudPath}</g>`;
        } else {
            // Clear / Default - sun or moon based on time
            content = isNight ? `${moonGroup}` : `${sunGroup}`;
        }

        return `<svg width="96" height="96" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">${defs}${content}</svg>`;
    };

    // Translate common English weather descriptions to Arabic when needed
    const translateWeatherDescription = (desc) => {
        if (!desc) return '';
        if (!isArabic) return desc;
        const d = desc.toLowerCase();
        const exact = {
            'clear sky': 'سماء صافية',
            'few clouds': 'غيوم متفرقة',
            'scattered clouds': 'غيوم متناثرة',
            'broken clouds': 'غيوم متكسرة',
            'overcast clouds': 'غائم كلياً',
            'light rain': 'أمطار خفيفة',
            'moderate rain': 'أمطار متوسطة',
            'heavy intensity rain': 'أمطار غزيرة',
            'shower rain': 'زخات مطر',
            'light snow': 'ثلوج خفيفة',
            'snow': 'ثلوج',
            'thunderstorm': 'عاصفة رعدية',
            'mist': 'ضباب',
            'fog': 'ضباب',
            'freezing fog': 'ضباب متجمد',
            'drizzle': 'رذاذ'
        };

        if (exact[d]) return exact[d];
        if (d.includes('clear')) return 'صحو';
        if (d.includes('thunder')) return 'عاصفة رعدية';
        if (d.includes('drizzle') || d.includes('rain')) return 'أمطار';
        if (d.includes('snow')) return 'ثلوج';
        if (d.includes('cloud')) return 'غيوم';
        if (d.includes('mist') || d.includes('fog') || d.includes('smog')) return 'ضباب';

        return desc;
    };

    const getTimeOfDay = (timeStr) => {
        // timeStr is expected to be ISO format like "2023-12-10T19:00"
        // We parse the hour from it.
        const date = new Date(timeStr);
        const hour = date.getHours();

        if (hour >= 0 && hour < 6) return 'midnight';
        if (hour >= 6 && hour < 12) return 'morning';
        if (hour >= 12 && hour < 18) return 'afternoon';
        return 'night';
    };

    const updateBackground = (description, timeStr) => {
        weatherBg.className = 'weather-bg weather';
        // Reset body classes
        document.body.classList.remove('rain', 'thunder', 'snow', 'cloudy', 'clear', 'midnight', 'morning', 'afternoon', 'night');
        
        const desc = description.toLowerCase();
        let weatherClass = 'clear';
        
        if (desc.includes('rain') || desc.includes('drizzle')) {
            weatherClass = 'rain';
        } else if (desc.includes('thunder')) {
            weatherClass = 'thunder';
        } else if (desc.includes('snow')) {
            weatherClass = 'snow';
        } else if (desc.includes('cloud') || desc.includes('overcast') || desc.includes('fog')) {
            weatherClass = 'cloudy';
        }
        
        weatherBg.classList.add(weatherClass);
        document.body.classList.add(weatherClass);

        if (timeStr) {
            const timeClass = getTimeOfDay(timeStr);
            weatherBg.classList.add(timeClass);
            document.body.classList.add(timeClass);
        }
    };

    let currentTimezone = 'UTC';
    let timeInterval = null;

    const updateDateTime = (timezone) => {
        currentTimezone = timezone || 'UTC';
        
        const updateTime = () => {
            const now = new Date();
            const timeOptions = { 
                hour: '2-digit', 
                minute: '2-digit',
                timeZone: currentTimezone,
                hour12: true
            };
            const dateOptions = { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                timeZone: currentTimezone
            };

            currentTimeEl.textContent = now.toLocaleTimeString(locale, timeOptions);
            dateDisplayEl.textContent = now.toLocaleDateString(locale, dateOptions);
        };
        
        updateTime();
        
        // Clear existing interval and set new one
        if (timeInterval) clearInterval(timeInterval);
        timeInterval = setInterval(updateTime, 1000);
    };

    let map;
    let radarLayer;
    let satelliteLayer;
    let layerControl;
    let hoverTimeout;
    let hoverPopup;

    const initMap = (lat, lon) => {
        if (typeof L === 'undefined') {
            console.error('Leaflet library is not loaded.');
            return;
        }

        if (!map) {
            map = L.map('radar-map').setView([lat, lon], 8);
            
            const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map);
            
            addRadarLayers();

            // Initialize hover popup
            hoverPopup = L.popup({
                closeButton: false,
                className: 'weather-hover-popup',
                offset: L.point(0, -10)
            });

            // Add hover interaction
            map.on('mousemove', (e) => {
                const { lat, lng } = e.latlng;
                
                clearTimeout(hoverTimeout);
                
                hoverTimeout = setTimeout(async () => {
                    try {
                        const apiBase = window.appConfig?.apiBaseUrl || '/api';
                        const response = await fetch(`${apiBase}/weather?lat=${lat}&lon=${lng}`);
                        if (!response.ok) return;
                        const data = await response.json();
                        const desc = data.weather[0].description;
                        const temp = Math.round(data.main.temp);
                        const formattedDesc = translateWeatherDescription(desc);

                        hoverPopup
                            .setLatLng(e.latlng)
                            .setContent(`<div class="map-hover-content"><b>${formattedDesc}</b><br>${temp}°</div>`)
                            .openOn(map);
                    } catch (err) {
                        console.error(err);
                    }
                }, 600); // 600ms delay
            });

            map.on('mouseout', () => {
                clearTimeout(hoverTimeout);
                map.closePopup();
            });

            map.on('movestart', () => {
                clearTimeout(hoverTimeout);
                map.closePopup();
            });

        } else {
            map.setView([lat, lon], 8);
        }
    };

    const addRadarLayers = async () => {
        const loader = document.getElementById('map-loader');
        loader.classList.add('active');

        try {
            const response = await fetch('https://api.rainviewer.com/public/weather-maps.json');
            const data = await response.json();
            const host = data.host;

            // Radar (Precipitation)
            const latestRadar = data.radar.past[data.radar.past.length - 1];
            radarLayer = L.tileLayer(`${host}${latestRadar.path}/256/{z}/{x}/{y}/2/1_1.png`, {
                opacity: 0.8,
                attribution: '&copy; <a href="https://www.rainviewer.com">RainViewer</a>'
            });

            // Satellite (Clouds) - Infrared
            let satelliteUrl = '';
            if (data.satellite && data.satellite.infrared && data.satellite.infrared.length > 0) {
                const latestSatellite = data.satellite.infrared[data.satellite.infrared.length - 1];
                satelliteUrl = `${host}${latestSatellite.path}/256/{z}/{x}/{y}/0/0_0.png`; // 0 color scheme for satellite
                
                satelliteLayer = L.tileLayer(satelliteUrl, {
                    opacity: 0.6,
                    attribution: '&copy; <a href="https://www.rainviewer.com">RainViewer</a>'
                });
            }

            // Layer Control
            const baseMaps = {};
            const overlayMaps = {};

            const mapLabel = isArabic ? 'الخريطة' : 'Map';
            const precipitationLabel = isArabic ? 'هطول (مطر/ثلج)' : 'Precipitation (Rain/Snow)';
            const cloudsLabel = isArabic ? 'السحب (قمر صناعي)' : 'Clouds (Satellite)';

            baseMaps[mapLabel] = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');
            overlayMaps[precipitationLabel] = radarLayer;

            // Add layers to map and handle loading events
            let layersToLoad = 0;
            const checkLoad = () => {
                layersToLoad--;
                if (layersToLoad <= 0) {
                    loader.classList.remove('active');
                }
            };

            if (satelliteLayer) {
                overlayMaps[cloudsLabel] = satelliteLayer;
                satelliteLayer.addTo(map);
                layersToLoad++;
                satelliteLayer.on('load', checkLoad);
            }

            radarLayer.addTo(map);
            layersToLoad++;
            radarLayer.on('load', checkLoad);
            radarLayer.bringToFront();

            if (layerControl) {
                map.removeControl(layerControl);
            }
            
            layerControl = L.control.layers(null, overlayMaps).addTo(map);
            
        } catch (e) {
            console.error("Failed to load radar layers", e);
            loader.classList.remove('active');
        }
    };

    const fetchWeather = async (lat, lon, name, silent = false) => {
        if (!silent) {
            globalLoader.classList.remove('hidden');
        }
        
        // Store current location for refresh
        currentLat = lat;
        currentLon = lon;
        currentCityName = name;
        
        try {
            const apiBase = window.appConfig?.apiBaseUrl || '/api';
            const response = await fetch(`${apiBase}/weather?lat=${lat}&lon=${lon}`);
            if (!response.ok) throw new Error('Weather data unavailable');
            
            const data = await response.json();
            
            cityNameEl.textContent = name || data.name;
            tempEl.textContent = `${Math.round(data.main.temp)}`;
            descriptionEl.textContent = translateWeatherDescription(data.weather[0].description);
            windSpeedEl.textContent = `${data.wind.speed} ${units.wind}`;
            humidityEl.textContent = `${data.main.humidity}${units.humidity}`;
            feelsLikeEl.textContent = `${Math.round(data.main.feels_like)}${units.feelsLike}`;
            pressureEl.textContent = `${data.main.pressure} ${units.pressure}`;
            visibilityEl.textContent = `${(data.visibility / 1000).toFixed(1)} ${units.visibility}`;
            precipitationEl.textContent = `${data.precipitation} ${units.precipitation}`;
            
            updateBackground(data.weather[0].description, data.dt);
            iconContainer.innerHTML = getIconSVG(data.weather[0].description, data.is_day); 
            
            updateDateTime(data.timezone);
            initMap(lat, lon);
            
            if (data.hourly) renderHourlyForecast(data.hourly);
            if (data.daily) renderDailyForecast(data.daily);

            searchResultsEl.style.display = 'none';

        } catch (error) {
            showError(error.message);
        } finally {
            if (!silent) {
                setTimeout(() => {
                    globalLoader.classList.add('hidden');
                }, 500);
            }
        }
    };

    const handleSearchInput = (e) => {
        const query = e.target.value.trim();
        
        clearTimeout(searchTimeout);
        
        if (query.length < 2) {
            searchResultsEl.style.display = 'none';
            return;
        }

        searchTimeout = setTimeout(async () => {
            try {
                const apiBase = window.appConfig?.apiBaseUrl || '/api';
                const response = await fetch(`${apiBase}/search?q=${encodeURIComponent(query)}`);
                if (!response.ok) return;
                
                const locations = await response.json();
                renderSearchResults(locations);
            } catch (error) {
                console.error("Search error", error);
            }
        }, 150);
    };

    const renderSearchResults = (locations) => {
        searchResultsEl.innerHTML = '';
        if (locations.length === 0) {
            searchResultsEl.style.display = 'none';
            return;
        }

        locations.forEach(loc => {
            const div = document.createElement('div');
            div.className = 'search-result-item';
            div.innerHTML = `
                <span class="city">${loc.name}</span>
                <span class="country">${loc.region ? loc.region + ', ' : ''}${loc.country}</span>
            `;
            div.addEventListener('click', () => {
                searchInput.value = loc.name;
                countryNameEl.textContent = loc.country || '';
                fetchWeather(loc.lat, loc.lon, loc.name);
            });
            searchResultsEl.appendChild(div);
        });

        searchResultsEl.style.display = 'block';
    };

    /**
     * Show a friendly error message to the user
     * @param {string} msg - Message to display
     */
    const showError = (msg) => {
        errorToast.textContent = msg;
        errorToast.style.display = 'block';
        setTimeout(() => {
            errorToast.style.display = 'none';
        }, 3000);
    };

    /**
     * Handle initial load errors gracefully
     * @param {Error} error
     */
    const handleInitialLoadError = (error) => {
        console.error("Initial load failed:", error);
        const msg = isArabic ? 'تعذر تحديد موقعك. يتم عرض الطقس للندن بشكل افتراضي.' : "We couldn't determine your location. Showing weather for London as a default.";
        showError(msg);
        fetchWeather(51.5074, -0.1278, isArabic ? 'لندن' : 'London');
    };

    searchInput.addEventListener('input', handleSearchInput);
    
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container')) {
            searchResultsEl.style.display = 'none';
        }
    });

    // Attempt to get user's location, fallback to default if not available
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                let cityName = "Current Location";
                let countryName = "";
                try {
                    const apiBase = window.appConfig?.apiBaseUrl || '/api';
                    const geoResp = await fetch(`${apiBase}/reverse-geocode?lat=${latitude}&lon=${longitude}`);
                    if (geoResp.ok) {
                        const geoData = await geoResp.json();
                        cityName = geoData.name;
                        countryName = geoData.country || "";
                    }
                } catch (e) {
                    console.error("Reverse geocoding failed", e);
                }
                countryNameEl.textContent = countryName;
                fetchWeather(latitude, longitude, cityName);
            },
            (error) => {
                handleInitialLoadError(error);
            }
        );
    } else {
        handleInitialLoadError(new Error("Geolocation not supported"));
    }

    /* Calendar: load season and lunar house from assets/calendar.json and render */
    const loadCalendar = async () => {
        try {
            const resp = await fetch('/assets/calendar.json');
            if (!resp.ok) return;
            const data = await resp.json();
            const lang = document.documentElement.lang || 'en';
            const cal = (lang.startsWith('ar') ? data.calendar_ar : data.calendar_en) || data.calendar || (lang.startsWith('ar') ? data.calendar_en : data.calendar_ar) || null;
            if (!cal) return;

            const today = new Date();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const dd = String(today.getDate()).padStart(2, '0');
            const md = `${mm}-${dd}`;

            const inRange = (start, end, cur) => {
                // start/end are MM-DD strings
                if (start <= end) {
                    return cur >= start && cur <= end;
                }
                // Wrapped range (e.g., 12-07 -> 03-19)
                return cur >= start || cur <= end;
            };

            let currentSeason = null;
            for (const s of cal.seasons) {
                if (inRange(s.start, s.end, md)) {
                    currentSeason = s;
                    break;
                }
            }

            let currentHouse = null;
            if (cal.lunar_houses_cycle && Array.isArray(cal.lunar_houses_cycle)) {
                for (const h of cal.lunar_houses_cycle) {
                    if (inRange(h.start, h.end, md)) {
                        currentHouse = h;
                        break;
                    }
                }
            }

            const seasonEl = document.getElementById('cal-season-wide');
            const item1 = document.getElementById('cal-item-1');
            const item2 = document.getElementById('cal-item-2');

            if (!seasonEl) return;

            if (currentSeason) {
                const name = currentSeason.name;
                const range = `${currentSeason.start} — ${currentSeason.end}`;
                const houseText = currentHouse ? currentHouse.name : '';
                const houseLabel = userLang.startsWith('ar') ? 'منزلة' : 'House';
                const houseDisplay = houseText ? `${houseLabel}: ${houseText}` : range;

                seasonEl.innerHTML = `<div class="cal-season-content"><h3 class="cal-season-name">${name}</h3><p class="cal-season-sub">${houseDisplay}</p></div>`;
                seasonEl.style.display = 'flex';
            } else {
                seasonEl.style.display = 'none';
            }

            // Decorative small boxes: show range and house short
            if (item1) item1.textContent = currentSeason ? `${currentSeason.start} → ${currentSeason.end}` : '';
            if (item2) item2.textContent = currentHouse ? currentHouse.name : '';

        } catch (e) {
            // fail silently
            console.error('Calendar load failed', e);
        }
    };

    loadCalendar();
});
