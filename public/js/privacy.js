(async function() {
    const container = document.getElementById('privacy-content');
    const loading = document.createElement('div');
    loading.id = 'privacy-loading';
    loading.textContent = 'Loading...';
    container.appendChild(loading);

    try {
        const resp = await fetch('/api/privacypolicy', { cache: 'no-store' });
        if (!resp.ok) throw new Error('Failed to load privacy policy');
        const data = await resp.json();
        const lang = document.documentElement.lang && document.documentElement.lang.startsWith('ar') ? 'ar' : 'en';
        const policy = data[lang] || data.en || null;
        container.removeChild(loading);
        if (!policy) {
            container.textContent = lang === 'ar' ? 'تعذر تحميل سياسة الخصوصية' : 'Could not load privacy policy.';
            return;
        }

        const h1 = document.createElement('h1');
        h1.textContent = policy.title || (lang === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy');
        container.appendChild(h1);

        policy.sections && policy.sections.forEach(sec => {
            const h3 = document.createElement('h3');
            h3.textContent = sec.heading || '';
            const p = document.createElement('p');
            p.textContent = sec.content || '';
            container.appendChild(h3);
            container.appendChild(p);
        });

        const back = document.createElement('p');
        back.style.marginTop = '1.5rem';
        const link = document.createElement('a');
        link.className = 'btn btn-link';
        link.href = lang === 'ar' ? '/ar/' : '/';
        link.textContent = lang === 'ar' ? 'العودة إلى الصفحة الرئيسية' : 'Back to Home';
        back.appendChild(link);
        container.appendChild(back);

    } catch (err) {
        if (loading.parentNode) container.removeChild(loading);
        container.textContent = document.documentElement.lang && document.documentElement.lang.startsWith('ar') ? 'تعذر تحميل سياسة الخصوصية' : 'Failed to load privacy policy';
        console.error('[Privacy Page] Error loading policy', err);
    }
})();
