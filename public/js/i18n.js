// Simple i18n helper: set/get language cookie and redirect to matching page
(function(){
    const COOKIE_NAME = 'saudiweather_lang';

    function setCookie(name, value, days) {
        let expires = '';
        if (days) {
            const date = new Date();
            date.setTime(date.getTime() + (days*24*60*60*1000));
            expires = '; expires=' + date.toUTCString();
        }
        const secure = location.protocol === 'https:' ? '; Secure' : '';
        const sameSite = '; SameSite=Lax';
        document.cookie = name + '=' + encodeURIComponent(value || '')  + expires + '; path=/' + sameSite + secure;
    }

    function getCookie(name) {
        const nameEQ = name + '=';
        const ca = document.cookie.split(';');
        for(let i=0;i < ca.length;i++) {
            let c = ca[i];
            while (c.charAt(0)==' ') c = c.substring(1,c.length);
            if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
        }
        return null;
    }

    function computeAlternate(path, lang) {
        const p = path || '/';
        if (lang === 'ar') {
            if (p.startsWith('/ar/') || p === '/ar' || p === '/ar/') return p;
            if (p === '/' || p === '/index.html') return '/ar/';
            if (p.endsWith('.html')) {
                const base = p.split('/').pop();
                return '/ar/' + base;
            }
            return '/ar/';
        }

        if (lang === 'en') {
            if (p.startsWith('/ar/')) return p.replace(/^\/ar\//, '/');
            if (p === '/ar' || p === '/ar/') return '/';
            if (p.endsWith('-ar.html')) return '/' + p.split('/').pop().replace('-ar.html', '.html');
            return p;
        }

        return p;
    }

    function handleLinkClick(e) {
        const link = e.currentTarget;
        const lang = link.dataset.lang;
        if (!lang) return;
        e.preventDefault();
        setCookie(COOKIE_NAME, lang, 365);
        const href = link.getAttribute('href') || computeAlternate(window.location.pathname, lang);
        window.location.href = href;
    }

    function attachHandlers() {
        const links = document.querySelectorAll('.lang-link');
        links.forEach(l => l.addEventListener('click', handleLinkClick));
    }

    function autoRedirect() {
        const pref = getCookie(COOKIE_NAME);
        if (!pref) return;
        const path = window.location.pathname;
        if (pref === 'ar' && !path.startsWith('/ar/')) {
            const dest = computeAlternate(path, 'ar');
            if (dest !== path) window.location.href = dest;
        }
        if (pref === 'en' && path.startsWith('/ar/')) {
            const dest = computeAlternate(path, 'en');
            if (dest !== path) window.location.href = dest;
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        attachHandlers();
        autoRedirect();
    });
})();
