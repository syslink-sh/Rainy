// Simple i18n helper: set/get language cookie and redirect to matching page
(function(){
    const COOKIE_NAME = 'rainy_lang';

    function setCookie(name, value, days) {
        let expires = '';
        if (days) {
            const date = new Date();
            date.setTime(date.getTime() + (days*24*60*60*1000));
            expires = '; expires=' + date.toUTCString();
        }
        document.cookie = name + '=' + (value || '')  + expires + '; path=/';
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
        // If switching to Arabic
        if (lang === 'ar') {
            if (path === '/' || path === '/index.html') return '/index-ar.html';
            if (path.endsWith('/')) return '/index-ar.html';
            if (path.endsWith('.html')) {
                if (path.includes('-ar.html')) return path; // already ar
                return path.replace('.html', '-ar.html');
            }
            return '/index-ar.html';
        }

        // Switching to English
        if (lang === 'en') {
            if (path === '/index-ar.html') return '/';
            if (path.endsWith('-ar.html')) return path.replace('-ar.html', '.html').replace('/index.html','/');
            // default to root
            return '/';
        }

        return path;
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
        // If preference is arabic and we're not on an arabic page, redirect
        if (pref === 'ar' && !path.includes('-ar.html')) {
            const dest = computeAlternate(path, 'ar');
            if (dest !== path) window.location.href = dest;
        }
        // If preference is en and we're on an arabic page, redirect to en
        if (pref === 'en' && path.includes('-ar.html')) {
            const dest = computeAlternate(path, 'en');
            if (dest !== path) window.location.href = dest;
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        attachHandlers();
        autoRedirect();
    });
})();
