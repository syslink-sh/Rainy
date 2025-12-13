document.addEventListener('DOMContentLoaded', () => {
    // Determine locale from the page language attribute
    const userLang = document.documentElement.lang || 'en';
    const locale = userLang.startsWith('ar') ? 'ar-EG' : 'en-US';
    const isArabic = userLang.startsWith('ar');



    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    const searchResultsEl = document.getElementById('search-results');
    const cityNameEl = document.getElementById('city-name');
    const countryNameEl = document.getElementById('country-name');
    const currentTimeEl = document.getElementById('current-time');
    const dateDisplayEl = document.getElementById('date-display');
    const tempEl = document.getElementById('temp');
    const descriptionEl = document.getElementById('description');
    const weatherBg = document.getElementById('weather-bg');
    const errorToast = document.getElementById('error-toast');
    const globalLoader = document.getElementById('global-loader');
    const iconContainer = document.getElementById('weather-icon-container');
    const hourlyForecastEl = document.getElementById('hourly-forecast');
    const dailyForecastEl = document.getElementById('daily-forecast');

    let searchTimeout;
    let weatherFetchController = null;
    let searchFetchController = null;
    let currentLat = null;
    let currentLon = null;
    let currentCityName = null;

    // Global error handlers to capture unexpected runtime errors and promise rejections
    window.addEventListener('error', (e) => {
        console.error('[Global Error] ', e.message, e.filename, e.lineno, e.colno, e.error && e.error.stack);
    });
    window.addEventListener('unhandledrejection', (e) => {
        console.error('[Unhandled Rejection]', e.reason, e.promise);
    });

    // Basic DOM checks - if a few core elements are missing, stop further UI setup
    if (!searchInput || !cityNameEl || !tempEl || !descriptionEl || !iconContainer) {
        console.error('Essential UI elements are missing, aborting initialization');
        return;
    }

    // Small helper to safely set textContent and log missing element locations
    const safeSetText = (el, text, name = '') => {
        if (!el) {
            console.warn('[Saudi Weather] Missing element for setText', name || '(unknown)', '\n', new Error().stack);
            return;
        }
        try { el.textContent = text; } catch (e) { console.warn('[Saudi Weather] Failed to set textContent for', name || '(unknown)', e); }
    };

    // Register for periodic sync and setup online/offline handlers
    // Improves offline experience and keeps weather data fresh
    const setupServiceWorkerCommunication = async () => {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            // Listen for messages from service worker
            navigator.serviceWorker.addEventListener('message', (event) => {
                if (event.data && event.data.type === 'PERIODIC_SYNC') {
                    if (window.appConfig?.debug) console.log('[Saudi Weather] Weather data refreshed automatically.');
                    if (currentLat && currentLon) {
                        fetchWeather(currentLat, currentLon, currentCityName, true);
                    }
                }
                if (event.data && event.data.type === 'CACHE_REFRESHED') {
                    if (window.appConfig?.debug) console.log('[Saudi Weather] Cache updated for offline use.');
                }
            });

            // Register periodic sync if supported
            try {
                await navigator.serviceWorker.ready;
                const registration = await navigator.serviceWorker.getRegistration();
                if (registration && 'periodicSync' in registration) {
                    const status = await navigator.permissions.query({
                        name: 'periodic-background-sync',
                    });
                    if (status.state === 'granted') {
                        await registration.periodicSync.register('weather-periodic-sync', {
                            minInterval: 60 * 60 * 1000, // 1 hour
                        });
                        if (window.appConfig?.debug) console.log('[Saudi Weather] Periodic sync registered.');
                    }
                }
            } catch (error) {
                if (window.appConfig?.debug) console.log('[Saudi Weather] Periodic sync registration failed:', error);
            }
        }
    };

    // Handle online/offline status changes
    // Improves user feedback and cache refresh
    const setupConnectivityListeners = () => {
        window.addEventListener('online', () => {
            if (window.appConfig?.debug) console.log('[Saudi Weather] You are back online. Weather data will be refreshed.');
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
            if (window.appConfig?.debug) console.log('[Saudi Weather] You are offline. Cached data will be shown.');
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
        if (!hourlyForecastEl) return;
        hourlyForecastEl.innerHTML = '';
        const now = new Date();
        const currentHour = now.getHours();
        const fragment = document.createDocumentFragment();
        hourly.time.forEach((timeStr, index) => {
            const time = new Date(timeStr);
            const hour = time.getHours();
            
            // Only show future hours (or current)
            if (index < 24) {
                const div = document.createElement('div');
                div.className = 'hourly-item';
                const timeSpan = document.createElement('span');
                timeSpan.className = 'time';
                safeSetText(timeSpan, `${hour}:00`, 'timeSpan');
                const iconI = document.createElement('i');
                iconI.className = `fas ${getWeatherIconClass(hourly.weather_code[index])} icon`;
                const tempSpan = document.createElement('span');
                tempSpan.className = 'temp';
                safeSetText(tempSpan, Math.round(hourly.temperature_2m[index]), 'tempSpan');
                div.appendChild(timeSpan);
                div.appendChild(iconI);
                div.appendChild(tempSpan);
                fragment.appendChild(div);
            }
        });
        hourlyForecastEl.appendChild(fragment);
    };

    const renderDailyForecast = (daily) => {
        if (!dailyForecastEl) return;
        dailyForecastEl.innerHTML = '';
        const fragment = document.createDocumentFragment();
        
        daily.time.forEach((timeStr, index) => {
            const date = new Date(timeStr);
            const dayName = date.toLocaleDateString(locale, { weekday: 'long' });
            const todayLabel = locale.startsWith('ar') ? 'اليوم' : 'Today';

            const div = document.createElement('div');
            div.className = 'daily-item';
            const daySpan = document.createElement('span');
            daySpan.className = 'day';
            safeSetText(daySpan, index === 0 ? todayLabel : dayName, 'daySpan');
            const iconWrap = document.createElement('div');
            iconWrap.className = 'icon';
            const iconI = document.createElement('i');
            iconI.className = `fas ${getWeatherIconClass(daily.weather_code[index])}`;
            iconWrap.appendChild(iconI);
            const temps = document.createElement('div');
            temps.className = 'temps';
            const max = document.createElement('span');
            max.className = 'max';
            safeSetText(max, Math.round(daily.temperature_2m_max[index]), 'maxTemp');
            const min = document.createElement('span');
            min.className = 'min';
            safeSetText(min, Math.round(daily.temperature_2m_min[index]), 'minTemp');
            temps.appendChild(max);
            temps.appendChild(min);
            div.appendChild(daySpan);
            div.appendChild(iconWrap);
            div.appendChild(temps);
            fragment.appendChild(div);
        });
        dailyForecastEl.appendChild(fragment);
    };

    const getIconSVG = (code, isDay) => {
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

        if (code >= 51 && code <= 67) {
            content = `<g filter="url(#cloudShadow)">${darkCloudPath}${rainDrops}</g>`;
        } else if (code >= 95 && code <= 99) {
            content = `<g filter="url(#cloudShadow)">${darkCloudPath}${lightning}</g>`;
        } else if (code >= 71 && code <= 86) {
            content = `<g filter="url(#cloudShadow)">${cloudPath}${snowFlakes}</g>`;
        } else if ((code >= 2 && code <= 3) || code === 45 || code === 48) {
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
        if (weatherBg) weatherBg.className = 'weather-bg weather';
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
        
        if (weatherBg) weatherBg.classList.add(weatherClass);
        document.body.classList.add(weatherClass);

        if (timeStr) {
            const timeClass = getTimeOfDay(timeStr);
            if (weatherBg) weatherBg.classList.add(timeClass);
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

            safeSetText(currentTimeEl, now.toLocaleTimeString(locale, timeOptions), 'currentTimeEl');
            safeSetText(dateDisplayEl, now.toLocaleDateString(locale, dateOptions), 'dateDisplayEl');
        };
        
        updateTime();
        
        // Clear existing interval and set new one
        if (timeInterval) clearInterval(timeInterval);
        timeInterval = setInterval(updateTime, 1000);
    };

    const fetchWeather = async (lat, lon, name, silent = false) => {
        // Cancel any in-flight weather request to avoid race condition
        if (weatherFetchController) {
            try { weatherFetchController.abort(); } catch (e){}
        }
        weatherFetchController = new AbortController();
        const signal = weatherFetchController.signal;
        if (!silent && globalLoader) {
            globalLoader.classList.remove('hidden');
        }
        
        // Store current location for refresh
        currentLat = lat;
        currentLon = lon;
        currentCityName = name;
        
        try {
            const apiBase = window.appConfig?.apiBaseUrl || '/api';
            const response = await fetch(`${apiBase}/weather?lat=${lat}&lon=${lon}`, { signal });
            if (!response.ok) throw new Error('Weather data unavailable');
            
            const data = await response.json();
            
            safeSetText(cityNameEl, name || data.name, 'cityNameEl');
            safeSetText(tempEl, data.main.temp ? `${Math.round(data.main.temp)}` : '--', 'tempEl');
            safeSetText(descriptionEl, translateWeatherDescription(data.weather[0].description), 'descriptionEl');
            
            updateBackground(data.weather[0].description, data.dt);
            // Render icon using numeric weather code to ensure safe, predictable output
            if (iconContainer) iconContainer.innerHTML = getIconSVG(data.weather[0].code, data.is_day);
            
            updateDateTime(data.timezone);
            
            if (data.hourly) renderHourlyForecast(data.hourly);
            if (data.daily) renderDailyForecast(data.daily);

            if (searchResultsEl) searchResultsEl.style.display = 'none';

        } catch (error) {
            if (error.name !== 'AbortError') showError(error.message);
        } finally {
            if (!silent && globalLoader) {
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
            if (searchResultsEl) searchResultsEl.style.display = 'none';
        }

            const debounceMs = window.appConfig?.searchDebounce || 150;
            searchTimeout = setTimeout(async () => {
            try {
            if (searchFetchController) { try { searchFetchController.abort(); } catch (e) {} }
            searchFetchController = new AbortController();
            const ssignal = searchFetchController.signal;
                const apiBase = window.appConfig?.apiBaseUrl || '/api';
            const response = await fetch(`${apiBase}/search?q=${encodeURIComponent(query)}`, { signal: ssignal });
                if (!response.ok) return;
                
                const locations = await response.json();
                renderSearchResults(locations);
            } catch (error) {
                if (error.name !== 'AbortError') console.error("Search error", error);
            }
        }, debounceMs);
    };

    const renderSearchResults = (locations) => {
        if (!searchResultsEl) return;
        searchResultsEl.innerHTML = '';
        if (locations.length === 0) {
            searchResultsEl.style.display = 'none';
            return;
        }

        locations.forEach(loc => {
            const displayName = isArabic && loc.arabic ? loc.arabic : loc.name;
            const div = document.createElement('div');
            div.className = 'search-result-item';
            const citySpan = document.createElement('span');
            citySpan.className = 'city';
            safeSetText(citySpan, displayName, 'citySpan');
            const countrySpan = document.createElement('span');
            countrySpan.className = 'country';
            safeSetText(countrySpan, `${loc.region ? loc.region + ', ' : ''}${loc.country}`, 'countrySpan');
            div.appendChild(citySpan);
            div.appendChild(countrySpan);
            div.addEventListener('click', () => {
                searchInput.value = displayName;
                safeSetText(countryNameEl, loc.country || '', 'countryNameEl');
                fetchWeather(loc.lat, loc.lon, loc.name);
            });
            searchResultsEl.appendChild(div);
        });

        if (searchResultsEl) searchResultsEl.style.display = 'block';
    };

    /**
     * Show a friendly error message to the user
     * @param {string} msg - Message to display
     */
    const showError = (msg) => {
        if (!errorToast) {
            console.error(msg);
            return;
        }
        safeSetText(errorToast, msg, 'errorToast');
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
            if (searchResultsEl) searchResultsEl.style.display = 'none';
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
                safeSetText(countryNameEl, countryName, 'countryNameEl');
                fetchWeather(latitude, longitude, cityName);
            },
            (error) => {
                handleInitialLoadError(error);
            }
        );
    } else {
        handleInitialLoadError(new Error("Geolocation not supported"));
    }

    /* Calendar: load season and render current month's value under the season */
    const loadCalendar = async () => {
        try {
            const apiBase = window.appConfig?.apiBaseUrl || '/api';
            const resp = await fetch(`${apiBase}/calendar`);
            if (!resp.ok) return;
            const data = await resp.json();

            if (!data || !data.currentEntry) return;

            const entry = data.currentEntry;
            const seasonEl = document.getElementById('cal-season-wide');
            if (!seasonEl) return;

            if (!entry) {
                seasonEl.style.display = 'none';
                return;
            }

            const langCode = userLang.startsWith('ar') ? 'ar' : 'en';

            let seasonName = '';
            let monthValue = '';
            if (langCode === 'ar') {
                seasonName = entry['الفصل (حسب الزعاق)'] || entry.Season_EN || '';
                monthValue = entry['الموسم المحلي والوصف المختصر'] || entry.Season_EN || '';
            } else {
                seasonName = entry.Season_EN || entry['الفصل (حسب الزعاق)'] || '';
                monthValue = entry.SeasonDescription_EN || entry.Season_EN || '';
            }

            const content = document.createElement('div');
            content.className = 'cal-season-content';
            const h3 = document.createElement('h3');
            h3.className = 'cal-season-name';
            safeSetText(h3, seasonName, 'cal-season-name');
            const p = document.createElement('p');
            p.className = 'cal-season-sub';
            safeSetText(p, monthValue, 'cal-season-sub');
            content.appendChild(h3);
            content.appendChild(p);
            seasonEl.innerHTML = '';
            seasonEl.appendChild(content);
            seasonEl.style.display = 'flex';

        } catch (e) {
            console.error('Calendar load failed', e);
        }
    };

    loadCalendar();
});
