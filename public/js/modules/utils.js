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
