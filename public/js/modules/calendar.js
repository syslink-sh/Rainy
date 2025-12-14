import { safeSetText } from './utils.js';

export const loadCalendar = async () => {
    try {
        const apiBase = window.appConfig?.apiBaseUrl || '/api';
        const resp = await fetch(`${apiBase}/calendar`);
        if (!resp.ok) return;
        const data = await resp.json();

        if (!data || !data.months) return;

        // Use Client Side Date
        const now = new Date();
        // Month is 0-indexed (0=Jan, 11=Dec), API keys are "01".."12"
        const monthKey = String(now.getMonth() + 1).padStart(2, '0');
        const entry = data.months[monthKey];

        const seasonEl = document.getElementById('cal-season-wide');
        if (!seasonEl) return;

        if (!entry) {
            seasonEl.style.display = 'none';
            return;
        }

        const userLang = document.documentElement.lang || 'en';
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
