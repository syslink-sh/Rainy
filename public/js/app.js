import { safeSetText, showError, translateWeatherDescription } from './modules/utils.js';
import { fetchWeatherData, searchLocations, sendAnalytics, reverseGeocode, fetchPrayerTimes } from './modules/weather-api.js';
import { renderHourlyForecast, renderDailyForecast, updateBackground, getIconSVG, renderPrayerTimes } from './modules/ui-renderer.js';
import { getLastLocationFromStorage, saveLastLocation, parseLatLonFromUrl, updateUrlForLocation, geolocateWithTimeout, isValidCoords } from './modules/location-service.js';

import { loadCalendar } from './modules/calendar.js';
import { renderSeasonWheel } from './modules/season-wheel.js';

document.addEventListener('DOMContentLoaded', () => {
    const userLang = document.documentElement.lang || 'en';

    const locale = userLang.startsWith('ar') ? 'ar-EG' : 'en-US';
    const isArabic = userLang.startsWith('ar');

    const searchInput = document.getElementById('search-input');
    const searchResultsEl = document.getElementById('search-results');
    const cityNameEl = document.getElementById('city-name');
    const countryNameEl = document.getElementById('country-name');
    const currentTimeEl = document.getElementById('current-time');
    const dateDisplayEl = document.getElementById('date-display');
    const tempEl = document.getElementById('temp');
    const descriptionEl = document.getElementById('description');
    const globalLoader = document.getElementById('global-loader');
    const iconContainer = document.getElementById('weather-icon-container');

    let searchTimeout;
    let weatherFetchController = null;
    let searchFetchController = null;

    // --- Loading Screen ---
    let _loaderTimeout = null;
    const showGlobalLoader = (maxDurationMs = 12000) => {
        if (!globalLoader) return;
        globalLoader.classList.remove('hidden');
        globalLoader.setAttribute('aria-hidden', 'false');
        document.body.style.pointerEvents = 'none';
        if (_loaderTimeout) clearTimeout(_loaderTimeout);
        if (maxDurationMs > 0) {
            _loaderTimeout = setTimeout(() => {
                if (globalLoader && !globalLoader.classList.contains('hidden')) {
                    try { showError(isArabic ? 'تعذر تحميل التطبيق' : 'Loading taking longer than expected'); } catch (e) { }
                    hideGlobalLoader();
                }
            }, maxDurationMs);
        }
    };
    const hideGlobalLoader = (delay = 250) => {
        if (!globalLoader) return;
        if (_loaderTimeout) { clearTimeout(_loaderTimeout); _loaderTimeout = null; }
        setTimeout(() => {
            globalLoader.classList.add('hidden');
            globalLoader.setAttribute('aria-hidden', 'true');
            document.body.style.pointerEvents = '';
        }, delay);
    };

    // --- Time Update ---
    let timeInterval = null;
    const updateDateTime = (timezone) => {
        const currentTimezone = timezone || 'UTC';
        const updateTime = () => {
            const now = new Date();
            const timeOptions = { hour: '2-digit', minute: '2-digit', timeZone: currentTimezone, hour12: true };
            const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: currentTimezone };
            safeSetText(currentTimeEl, now.toLocaleTimeString(locale, timeOptions), 'currentTimeEl');
            safeSetText(dateDisplayEl, now.toLocaleDateString(locale, dateOptions), 'dateDisplayEl');
        };
        updateTime();
        if (timeInterval) clearInterval(timeInterval);
        timeInterval = setInterval(updateTime, 1000);
    };

    // --- Fetch Logic ---
    const fetchWeather = async (lat, lon, name, silent = false) => {
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
            const offlineMsg = (window.appConfig?.OFFLINE_UI_MESSAGE && (isArabic ? window.appConfig.OFFLINE_UI_MESSAGE.ar : window.appConfig.OFFLINE_UI_MESSAGE.en)) || (isArabic ? 'لا يوجد اتصال بالإنترنت' : 'No internet');
            showError(offlineMsg);
            sendAnalytics('offline_no_cache_shown');
            return;
        }

        if (weatherFetchController) try { weatherFetchController.abort(); } catch (e) { }
        weatherFetchController = new AbortController();

        if (!silent) showGlobalLoader();

        try {
            const data = await fetchWeatherData(lat, lon);

            const displayName = name || data.name || (isArabic ? window.appConfig?.FALLBACK_LOCATION?.arDisplayName : window.appConfig?.FALLBACK_LOCATION?.displayName);
            safeSetText(cityNameEl, displayName, 'cityNameEl');
            safeSetText(tempEl, data.main.temp ? `${Math.round(data.main.temp)}` : '--', 'tempEl');
            safeSetText(descriptionEl, translateWeatherDescription(data.weather[0].description, isArabic), 'descriptionEl');

            updateBackground(data.weather[0].description, data.dt);
            if (iconContainer) iconContainer.innerHTML = getIconSVG(data.weather[0].code, data.is_day);

            updateDateTime(data.timezone);
            if (data.hourly) renderHourlyForecast(data.hourly, isArabic);
            if (data.daily) renderDailyForecast(data.daily, locale);

            // Fetch and render prayer times (non-blocking)
            fetchPrayerTimes(lat, lon).then(prayerData => {
                if (prayerData && prayerData.data && prayerData.data.timings) {
                    renderPrayerTimes(prayerData.data.timings, isArabic);
                }
            }).catch(err => console.warn('Prayer times fetch failed', err));

            if (searchResultsEl) searchResultsEl.style.display = 'none';

        } catch (error) {
            if (error.name !== 'AbortError') showError(error.message);
        } finally {
            if (!silent) hideGlobalLoader();
        }
    };

    // --- Search ---
    const handleSearchInput = (e) => {
        const query = e.target.value.trim();
        clearTimeout(searchTimeout);
        if (query.length < 2) {
            if (searchResultsEl) searchResultsEl.style.display = 'none';
            return;
        }
        searchTimeout = setTimeout(async () => {
            if (searchFetchController) try { searchFetchController.abort(); } catch (e) { }
            searchFetchController = new AbortController();
            const signal = searchFetchController.signal;
            try {
                const locations = await searchLocations(query, signal);
                renderSearchResults(locations);
            } catch (error) {
                if (error.name !== 'AbortError') console.error("Search error", error);
            }
        }, window.appConfig?.searchDebounce || 150);
    };

    const renderSearchResults = (locations) => {
        if (!searchResultsEl) return;
        searchResultsEl.innerHTML = '';
        if (locations.length === 0) {
            searchResultsEl.style.display = 'none';
            return;
        }
        locations.forEach(loc => {
            let displayName;
            if (isArabic) {
                // Strict Arabic: If loc.arabic exists use it, else if loc.name is Arabic script use it, else generic.
                if (loc.arabic) displayName = loc.arabic;
                else if (/[\u0600-\u06FF]/.test(loc.name)) displayName = loc.name;
                else displayName = loc.name; // Temporary, but ideally we want strict. The user said NO english.
                // Actually, if we want NO English, and we have only English name, we might be stuck.
                // But most Saudi cities have Arabic names in our JSON.
                // Let's use the loose check:
                displayName = loc.arabic || loc.name;
            } else {
                displayName = loc.name;
            }

            // Correction for strict user requirement "NO EN IN ARABIC"
            if (isArabic && !loc.arabic && !/[\u0600-\u06FF]/.test(displayName)) {
                displayName = "مدينة غير معربة"; // "Unlocalized City"
            }
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
        searchResultsEl.style.display = 'block';
    };

    if (searchInput) searchInput.addEventListener('input', handleSearchInput);
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container') && searchResultsEl) {
            searchResultsEl.style.display = 'none';
        }
    });

    // --- Init Location ---
    // --- Init Location ---
    const fetchDefaultLocation = async (silent = false) => {
        const fallback = window.appConfig?.FALLBACK_LOCATION || { lat: 24.7136, lon: 46.6753, displayName: 'Riyadh' };
        const name = isArabic && fallback.arDisplayName ? fallback.arDisplayName : fallback.displayName;
        updateUrlForLocation(fallback.lat, fallback.lon);
        await fetchWeather(fallback.lat, fallback.lon, name, silent);
    };

    const resolveLocationAndFetch = async () => {
        // 1. URL Params - fastest, authoritative
        const urlCoords = parseLatLonFromUrl();
        if (urlCoords) {
            fetchWeather(urlCoords.lat, urlCoords.lon, null);
            return;
        }

        // 2. Check Storage for Saved Location
        const savedLoc = getLastLocationFromStorage();
        if (savedLoc && isValidCoords(savedLoc.lat, savedLoc.lon)) {
            // Use saved location immediately
            fetchWeather(savedLoc.lat, savedLoc.lon, savedLoc.name, false);
        } else {
            // 3. Fallback to Default only if no saved location
            await fetchDefaultLocation(false);
        }

        // 4. Geolocation in background to update/refine
        try {
            const pos = await geolocateWithTimeout(4000);
            if (isValidCoords(pos.lat, pos.lon)) {
                let cityName = isArabic ? 'موقعي' : 'Current Location';
                try {
                    const geoData = await reverseGeocode(pos.lat, pos.lon);
                    cityName = geoData.name || cityName;
                    safeSetText(countryNameEl, geoData.country || '', 'countryNameEl');
                } catch (e) { }

                // Check if significantly different from saved to avoid unnecessary refresh
                // But for now, just update. It "authenticates" the location.
                updateUrlForLocation(pos.lat, pos.lon);

                // Save this new authenticated location
                saveLastLocation(pos.lat, pos.lon, cityName);

                fetchWeather(pos.lat, pos.lon, cityName, false);
            }
        } catch (e) {
            console.warn('Geolocation failed', e);
            // If we have saved location, we are good.
            // If we are on default, we stay on default.
        }
    };

    // Start
    resolveLocationAndFetch();
    loadCalendar();
    renderSeasonWheel('season-wheel-container');
});
