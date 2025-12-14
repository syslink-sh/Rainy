import { safeSetText, getWeatherIconClass, translateWeatherDescription } from './utils.js';

export const getIconSVG = (code, isDay) => {
    const isNight = isDay === 0;

    // Common gradients and filters (simplified for brevity, reuse logic from main.js)
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

    const sunGroup = `<g filter="url(#sunBlur)"><g stroke="#FFA500" stroke-width="3" stroke-linecap="round"><line x1="48" y1="12" x2="48" y2="6" /><line x1="48" y1="60" x2="48" y2="66" /><line x1="24" y1="36" x2="18" y2="36" /><line x1="72" y1="36" x2="78" y2="36" /><line x1="31" y1="19" x2="27" y2="15" /><line x1="65" y1="19" x2="69" y2="15" /><line x1="31" y1="53" x2="27" y2="57" /><line x1="65" y1="53" x2="69" y2="57" /></g><circle cx="48" cy="36" r="18" fill="url(#sunGradient)" /></g>`;
    const moonGroup = `<g><circle cx="48" cy="36" r="20" fill="url(#moonGradient)" /><circle cx="58" cy="32" r="16" fill="#141e30" /><g fill="rgba(255,255,255,0.8)"><circle cx="20" cy="20" r="1.5" /><circle cx="75" cy="15" r="1" /><circle cx="80" cy="55" r="1.5" /><circle cx="15" cy="60" r="1" /><circle cx="30" cy="70" r="1.2" /><circle cx="70" cy="70" r="1" /></g></g>`;
    const cloudPath = `<path d="M28 76C19.1634 76 12 68.8366 12 60C12 51.1634 19.1634 44 28 44C28.5 44 29.5 44.1 30.5 44.2C32.1 37.6 39.5 32 48 32C57.5 32 65.5 38.5 67.5 46.5C67.8 46.5 68.2 46.5 68.5 46.5C76.5 46.5 83 53 83 61C83 69 76.5 76 68.5 76H28Z" fill="url(#cloudGradient)" stroke="#FFFFFF" stroke-width="1"/>`;
    const darkCloudPath = `<path d="M28 76C19.1634 76 12 68.8366 12 60C12 51.1634 19.1634 44 28 44C28.5 44 29.5 44.1 30.5 44.2C32.1 37.6 39.5 32 48 32C57.5 32 65.5 38.5 67.5 46.5C67.8 46.5 68.2 46.5 68.5 46.5C76.5 46.5 83 53 83 61C83 69 76.5 76 68.5 76H28Z" fill="url(#rainGradient)" stroke="#94a3b8" stroke-width="1"/>`;
    const rainDrops = `<g stroke="#60A5FA" stroke-width="3" stroke-linecap="round"><line x1="36" y1="80" x2="32" y2="88" /><line x1="48" y1="80" x2="44" y2="88" /><line x1="60" y1="80" x2="56" y2="88" /></g>`;
    const snowFlakes = `<g fill="#FFFFFF"><circle cx="36" cy="84" r="2" /><circle cx="48" cy="84" r="2" /><circle cx="60" cy="84" r="2" /><circle cx="42" cy="92" r="2" /><circle cx="54" cy="92" r="2" /></g>`;
    const lightning = `<path d="M48 88L54 76H46L52 64" stroke="#F59E0B" stroke-width="3" stroke-linejoin="round" fill="none"/>`;

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
        content = isNight ? `${moonGroup}` : `${sunGroup}`;
    }

    return `<svg width="96" height="96" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">${defs}${content}</svg>`;
};

export const renderHourlyForecast = (hourly) => {
    const hourlyForecastEl = document.getElementById('hourly-forecast');
    if (!hourlyForecastEl) return;
    hourlyForecastEl.innerHTML = '';
    const now = new Date();
    const fragment = document.createDocumentFragment();
    hourly.time.forEach((timeStr, index) => {
        const time = new Date(timeStr);
        const hour = time.getHours();

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

export const renderDailyForecast = (daily, locale) => {
    const dailyForecastEl = document.getElementById('daily-forecast');
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

const getTimeOfDay = (timeStr) => {
    const date = new Date(timeStr);
    const hour = date.getHours();
    if (hour >= 0 && hour < 6) return 'midnight';
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    return 'night';
};

export const updateBackground = (description, timeStr) => {
    const weatherBg = document.getElementById('weather-bg');
    if (weatherBg) weatherBg.className = 'weather-bg weather';
    document.body.classList.remove('rain', 'thunder', 'snow', 'cloudy', 'clear', 'midnight', 'morning', 'afternoon', 'night');

    const desc = description.toLowerCase();
    let weatherClass = 'clear';

    if (desc.includes('rain') || desc.includes('drizzle')) weatherClass = 'rain';
    else if (desc.includes('thunder')) weatherClass = 'thunder';
    else if (desc.includes('snow')) weatherClass = 'snow';
    else if (desc.includes('cloud') || desc.includes('overcast') || desc.includes('fog')) weatherClass = 'cloudy';

    if (weatherBg) weatherBg.classList.add(weatherClass);
    document.body.classList.add(weatherClass);

    if (timeStr) {
        const timeClass = getTimeOfDay(timeStr);
        if (weatherBg) weatherBg.classList.add(timeClass);
        document.body.classList.add(timeClass);
    }
};
