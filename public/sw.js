// Set DEBUG to false for production; true for troubleshooting
const DEBUG = false;

// Periodic sync interval (in milliseconds) - optional
const PERIODIC_SYNC_TAG = 'weather-periodic-sync';

// Install event - just activate immediately
self.addEventListener('install', (event) => {
    if (DEBUG) console.log('[Service Worker] Installing...');
    event.waitUntil(self.skipWaiting());
});

// Activate event - just claim clients
self.addEventListener('activate', (event) => {
    if (DEBUG) console.log('[Service Worker] Activating...');
    event.waitUntil(self.clients.claim());
});

// Fetch event - network only, no caching
self.addEventListener('fetch', (event) => {
    const { request } = event;

    if (request.method !== 'GET') return;

    try {
        const url = new URL(request.url);
        if (!url.protocol.startsWith('http')) return;
    } catch (e) {
        return;
    }

    event.respondWith(networkOnlyStrategy(request));
});

// Network-only strategy
async function networkOnlyStrategy(request) {
    try {
        return await fetch(request);
    } catch (error) {
        if (DEBUG) console.log('[Service Worker] Network failed for request:', request.url);

        if (request.mode === 'navigate') {
            const offlineHtml = `<!doctype html><html><head><meta charset="utf-8"><title>Offline</title></head><body><h1>Offline</h1><p>The app is offline. No caching is enabled.</p></body></html>`;
            return new Response(offlineHtml, {
                status: 503,
                headers: { 'Content-Type': 'text/html' }
            });
        }

        if (request.headers.get('accept')?.includes('application/json') || request.url.includes('/api/')) {
            return new Response(JSON.stringify({ error: 'offline', message: 'Resource unavailable offline.' }), {
                status: 503,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return new Response('Offline: resource unavailable', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' }
        });
    }
}

// Push notifications
self.addEventListener('push', (event) => {
    if (!event.data) return;

    const data = event.data.json();
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

    event.waitUntil(self.registration.showNotification(data.title || 'Rainy Weather', options));
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

// Background sync (optional)
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-weather') {
        if (DEBUG) console.log('[Service Worker] Background sync triggered');
        // No caching, just notify clients if needed
    }
});

// Periodic sync (optional)
self.addEventListener('periodicsync', (event) => {
    if (event.tag === PERIODIC_SYNC_TAG) {
        if (DEBUG) console.log('[Service Worker] Periodic sync triggered');
    }
});

// Messages from clients
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
