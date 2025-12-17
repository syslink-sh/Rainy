export const safeSetText = (el, text, name = '') => {
    if (!el) {
        console.warn('[Saudi Weather] Missing element for setText', name || '(unknown)');
        return;
    }
    try { el.textContent = text; } catch (e) { console.warn('[Saudi Weather] Failed to set textContent', e); }
};

export const showError = (msg) => {
    const errorToast = document.getElementById('error-toast');
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

export const translateWeatherDescription = (desc, isArabic) => {
    if (!desc) return '';
    if (!isArabic) return desc;
    const d = desc.toLowerCase().trim();
    const exact = {
        'clear sky': 'سماء صافية',
        'main clear': 'صحو',
        'clear': 'صحو',
        'few clouds': 'غيوم متفرقة',
        'scattered clouds': 'غيوم متناثرة',
        'broken clouds': 'غيوم متكسرة',
        'overcast clouds': 'غائم كلياً',
        'overcast': 'غائم',
        'light rain': 'أمطار خفيفة',
        'moderate rain': 'أمطار متوسطة',
        'heavy intensity rain': 'أمطار غزيرة',
        'heavy rain': 'أمطار غزيرة',
        'shower rain': 'زخات مطر',
        'light snow': 'ثلوج خفيفة',
        'snow': 'ثلوج',
        'thunderstorm': 'عاصفة رعدية',
        'mist': 'ضباب',
        'fog': 'ضباب',
        'haze': 'سديم',
        'freezing fog': 'ضباب متجمد',
        'drizzle': 'رذاذ',
        'light drizzle': 'رذاذ خفيف',
        'rain': 'مطر'
    };

    if (exact[d]) return exact[d];

    // Fuzzy matching
    if (d.includes('clear')) return 'صحو';
    if (d.includes('thunder')) return 'عاصفة رعدية';
    if (d.includes('drizzle') || d.includes('rain')) return 'أمطار';
    if (d.includes('snow')) return 'ثلوج';
    if (d.includes('cloud') || d.includes('overcast')) return 'غائم';
    if (d.includes('mist') || d.includes('fog') || d.includes('smog') || d.includes('haze')) return 'ضباب';

    // Ultimate fallback to prevent English leakage
    return 'طقس عام';
};

export const getWeatherIconClass = (code) => {
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

export const getWeatherCodeDescription = (code, isArabic) => {
    const descriptions = {
        en: {
            0: 'Clear',
            1: 'Mainly Clear',
            2: 'Partly Cloudy',
            3: 'Overcast',
            45: 'Fog',
            48: 'Rime Fog',
            51: 'Light Drizzle',
            53: 'Drizzle',
            55: 'Heavy Drizzle',
            61: 'Light Rain',
            63: 'Rain',
            65: 'Heavy Rain',
            71: 'Light Snow',
            73: 'Snow',
            75: 'Heavy Snow',
            80: 'Light Showers',
            81: 'Showers',
            82: 'Heavy Showers',
            95: 'Thunderstorm',
            96: 'Thunderstorm',
            99: 'Heavy Thunderstorm'
        },
        ar: {
            0: 'صحو',
            1: 'صحو في الغالب',
            2: 'غيوم متفرقة',
            3: 'غائم',
            45: 'ضباب',
            48: 'ضباب متجمد',
            51: 'رذاذ خفيف',
            53: 'رذاذ',
            55: 'رذاذ كثيف',
            61: 'مطر خفيف',
            63: 'مطر',
            65: 'مطر غزير',
            71: 'ثلوج خفيفة',
            73: 'ثلوج',
            75: 'ثلوج كثيفة',
            80: 'زخات خفيفة',
            81: 'زخات',
            82: 'زخات غزيرة',
            95: 'عاصفة رعدية',
            96: 'عاصفة رعدية',
            99: 'عاصفة رعدية قوية'
        }
    };

    const lang = isArabic ? 'ar' : 'en';
    return descriptions[lang][code] || (isArabic ? 'غير معروف' : 'Unknown');
};

export const getWeatherEmoji = (code) => {
    if (code === 0 || code === 1) return '☀️';
    if (code === 2) return '⛅';
    if (code === 3) return '☁️';
    if (code >= 45 && code <= 48) return '🌫️';
    if (code >= 51 && code <= 55) return '🌦️';
    if (code >= 61 && code <= 67) return '🌧️';
    if (code >= 71 && code <= 77) return '🌨️';
    if (code >= 80 && code <= 82) return '🌧️';
    if (code >= 85 && code <= 86) return '🌨️';
    if (code >= 95 && code <= 99) return '⛈️';
    return '☁️';
};

export const formatTo12Hour = (hours, minutes, isArabic) => {
    let h = parseInt(hours, 10);
    const m = parseInt(minutes, 10);
    const suffix = h >= 12 ? (isArabic ? 'م' : 'PM') : (isArabic ? 'ص' : 'AM');
    h = h % 12;
    h = h ? h : 12; // the hour '0' should be '12'
    const mStr = m < 10 ? '0' + m : m;
    return `${h}:${mStr} ${suffix}`;
};
