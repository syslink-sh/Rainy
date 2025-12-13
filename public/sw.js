const CACHE_NAME = 'saudi-weather-v1';
const PRECACHE_URLS = [
    '/',
    '/index.html',
    '/offline.html',
    '/ar/',
    '/css/style.css',
    '/js/main.js',
    '/js/config.js',
    '/js/i18n.js',
    '/manifest.json'
];

self.addEventListener('install', (event) => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_NAME);
        // Precache each url but don't fail the whole install if one item is missing
        await Promise.allSettled(PRECACHE_URLS.map(async (url) => {
            try {
                const resp = await fetch(url, { cache: 'no-cache' });
                if (resp && resp.ok) {
                    await cache.put(url, resp.clone());
                }
            } catch (e) {
                // ignore individual failures
            }
        }));
        await self.skipWaiting();
    })());
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
        )).then(() => self.clients.claim())
    );
});

// Helper: network-first for API, cache-first for assets, fallback to index for navigation
self.addEventListener('fetch', (event) => {
    const { request } = event;

    if (request.method !== 'GET') return;

    const url = new URL(request.url);

    // Only handle http(s) requests
    if (!url.protocol.startsWith('http')) return;

    // API requests -> network-first
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(
            fetch(request).then(resp => {
                // Optionally cache API responses (not persisted long-term)
                return resp;
            }).catch(() => caches.match(request).then(cached => cached || new Response(JSON.stringify({ error: 'offline' }), { status: 503, headers: { 'Content-Type': 'application/json' } })))
        );
        return;
    }

    // Navigation requests -> return cached index.html fallback or offline page
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request).then(resp => resp).catch(async () => {
                // Try cached index.html first
                const cachedIndex = await caches.match('/index.html');
                if (cachedIndex) return cachedIndex;
                // Then try an offline fallback page if precached
                const offline = await caches.match('/offline.html');
                if (offline) return offline;
                // As a last resort return a minimal HTML response
                return new Response('<!doctype html><html><head><meta charset="utf-8"><title>Offline</title></head><body><h1>Offline</h1><p>Content is unavailable while offline.</p></body></html>', { headers: { 'Content-Type': 'text/html' } });
            })
        );
        return;
    }

    // Static assets -> cache-first
    event.respondWith(
        caches.match(request).then(cached => cached || fetch(request).then(networkResp => {
            // Put in cache for future requests (ignore opaque responses)
            if (networkResp && networkResp.status === 200 && networkResp.type !== 'opaque') {
                const copy = networkResp.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
            }
            return networkResp;
        }).catch(() => {
            // fallback for images or fonts could be provided here
            return new Response('OFFLINE', { status: 503, headers: { 'Content-Type': 'text/plain' } });
        }))
    );
});

// Push notifications
self.addEventListener('push', (event) => {
    if (!event.data) return;

    let data = null;
    try {
        data = event.data.json();
    } catch (e) {
        try {
            const text = event.data.text();
            data = { title: 'Saudi Weather', body: text };
        } catch (e2) {
            data = { title: 'Saudi Weather', body: 'Weather update available' };
        }
    }

    const options = {
        body: data.body || 'Weather update available',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        vibrate: [100, 50, 100],
        data: { url: data.url || '/' },
        actions: [
            { action: 'open', title: 'View Weather' },
            { action: 'dismiss', title: 'Dismiss' }
        ]
    };

    event.waitUntil(self.registration.showNotification(data.title || 'Saudi Weather', options));
});

// Notification click
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'dismiss') return;

    const urlToOpen = event.notification.data?.url || '/';
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) return client.focus();
            }
            if (clients.openWindow) return clients.openWindow(urlToOpen);
        })
    );
});

// Messages from clients
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
