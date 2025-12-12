const CACHE_NAME = 'rainy-weather-v2';
const STATIC_CACHE = 'rainy-static-v2';
const DYNAMIC_CACHE = 'rainy-dynamic-v2';

// Set DEBUG to false for production; set to true for troubleshooting.
const DEBUG = false;

// Periodic sync interval (in milliseconds) - 1 hour
const PERIODIC_SYNC_TAG = 'weather-periodic-sync';

// Static assets to cache on install
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/index-ar.html',
    '/css/style.css',
    '/js/config.js',
    '/js/i18n.js',
    '/js/main.js',
    '/manifest.json',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png',
    '/privacy.html',
    '/privacy-ar.html',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    if (DEBUG) console.log('[Service Worker] Installing (no-cache mode)...');
    // Do not cache anything on install. Move to skipWaiting so new SW becomes active.
    event.waitUntil(self.skipWaiting());
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    if (DEBUG) console.log('[Service Worker] Activating and clearing all caches (no-cache mode)...');
    // Delete all caches to ensure no cached responses remain
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => Promise.all(cacheNames.map((cn) => caches.delete(cn))))
            .then(() => self.clients.claim())
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    const { request } = event;

    // Only handle GET http/https requests
    if (request.method !== 'GET') return;
    try {
        const url = new URL(request.url);
        if (!url.protocol.startsWith('http')) return;
    } catch (e) {
        return;
    }

    // Respond with network-only for all requests. No caching.
    event.respondWith(networkOnlyStrategy(request));
});

// Network-first strategy (prefer fresh network response, fallback to cache)
async function networkFirstStrategy(request) {
    try {
        const response = await fetch(request);
        // Update dynamic cache with fresh response for offline use
        if (response && response.ok) {
            try {
                const cache = await caches.open(DYNAMIC_CACHE);
                cache.put(request, response.clone());
            } catch (e) {
                // ignore caching errors
            }
        }
        return response;
    } catch (err) {
        // Network failed, try cache
        const cached = await caches.match(request);
        if (cached) return cached;

        // If navigation request, fall back to the app shell
        if (request.mode === 'navigate') {
            const offlineResponse = await caches.match('/index.html');
            if (offlineResponse) return offlineResponse;
        }

        // otherwise rethrow
        throw err;
    }
}

// Network only strategy (for API calls - weather must always be fresh)
async function networkOnlyStrategy(request) {
    try {
        return await fetch(request);
    } catch (error) {
        if (DEBUG) console.log('[Service Worker] Network failed for request:', request.url);

        // If navigation (page load) return a minimal offline HTML page
        if (request.mode === 'navigate') {
            const offlineHtml = `<!doctype html><html><head><meta charset="utf-8"><title>Offline</title></head><body><h1>Offline</h1><p>The app is offline and caching is disabled. Please check your connection.</p></body></html>`;
            return new Response(offlineHtml, {
                status: 503,
                headers: { 'Content-Type': 'text/html' }
            });
        }

        // For API or asset requests return a generic offline JSON/text response
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

// Cache first strategy (for static assets)
async function cacheFirstStrategy(request) {
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
        // Return cached response and update cache in background
        updateCacheInBackground(request);
        return cachedResponse;
    }
    
    try {
        const networkResponse = await fetch(request);
        
        // Cache successful responses
        if (networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.error('[Service Worker] Fetch failed:', error);
        
        // Return offline page for navigation requests
        if (request.mode === 'navigate') {
            const offlineResponse = await caches.match('/index.html');
            if (offlineResponse) {
                return offlineResponse;
            }
        }
        
        throw error;
    }
}

// Update cache in background (stale-while-revalidate)
async function updateCacheInBackground(request) {
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse);
        }
    } catch (error) {
        // Silently fail - we already have cached version
    }
}

// Handle push notifications (for future weather alerts)
self.addEventListener('push', (event) => {
    if (!event.data) return;

    const data = event.data.json();
    const options = {
        body: data.body || 'Weather update available',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        vibrate: [100, 50, 100],
        data: {
            url: data.url || '/'
        },
        actions: [
            { action: 'open', title: 'View Weather' },
            { action: 'dismiss', title: 'Dismiss' }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(data.title || 'Rainy Weather', options)
    );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'dismiss') {
        return;
    }

    const urlToOpen = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // If app is already open, focus it
                for (const client of clientList) {
                    if (client.url.includes(self.location.origin) && 'focus' in client) {
                        return client.focus();
                    }
                }
                // Otherwise open new window
                if (clients.openWindow) {
                    return clients.openWindow(urlToOpen);
                }
            })
    );
});

// Background sync for offline weather requests
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-weather') {
        event.waitUntil(syncWeatherData());
    }
    // Refresh all cached assets when back online
    if (event.tag === 'refresh-cache') {
        event.waitUntil(refreshAllCaches());
    }
});

// Periodic background sync for weather data
self.addEventListener('periodicsync', (event) => {
    if (event.tag === PERIODIC_SYNC_TAG) {
        event.waitUntil(periodicWeatherSync());
    }
});

// Listen for online status to refresh caches
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'ONLINE_STATUS_CHANGED') {
        if (event.data.isOnline) {
                    if (DEBUG) console.log('[Service Worker] Back online - refreshing caches...');
            refreshAllCaches();
        }
    }
    // Manual cache refresh request
    if (event.data && event.data.type === 'REFRESH_CACHE') {
        event.waitUntil(refreshAllCaches());
    }
    // Skip waiting request (for updates)
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

async function syncWeatherData() {
    if (DEBUG) console.log('[Service Worker] Syncing weather data...');
    // Implementation for background sync when coming back online
    // This can be expanded to sync saved locations, etc.
}

// Periodic sync to keep weather data fresh
async function periodicWeatherSync() {
    if (DEBUG) console.log('[Service Worker] Periodic weather sync triggered...');
    try {
        // Notify all clients to refresh their weather data
        const clients = await self.clients.matchAll({ type: 'window' });
        clients.forEach(client => {
            client.postMessage({
                type: 'PERIODIC_SYNC',
                message: 'Refresh weather data'
            });
        });
    } catch (error) {
        console.error('[Service Worker] Periodic sync failed:', error);
    }
}

// Refresh all cached static assets when internet becomes available
async function refreshAllCaches() {
    if (DEBUG) console.log('[Service Worker] Refreshing all caches...');
    try {
        const cache = await caches.open(STATIC_CACHE);
        
        // Refresh static assets
        const refreshPromises = STATIC_ASSETS
            .filter(url => !url.startsWith('http')) // Only refresh local assets
            .map(async (url) => {
                try {
                    const response = await fetch(url, { cache: 'no-cache' });
                    if (response.ok) {
                        await cache.put(url, response);
                        if (DEBUG) console.log('[Service Worker] Refreshed:', url);
                    }
                } catch (err) {
                    if (DEBUG) console.log('[Service Worker] Failed to refresh:', url);
                }
            });
        
        await Promise.all(refreshPromises);
        
        // Also refresh dynamic cache entries
        const dynamicCache = await caches.open(DYNAMIC_CACHE);
        const dynamicRequests = await dynamicCache.keys();
        
        const dynamicRefreshPromises = dynamicRequests.map(async (request) => {
            try {
                const response = await fetch(request, { cache: 'no-cache' });
                if (response.ok) {
                    await dynamicCache.put(request, response);
                }
            } catch (err) {
                // Silently fail for dynamic resources
            }
        });
        
        await Promise.all(dynamicRefreshPromises);
        
        if (DEBUG) console.log('[Service Worker] Cache refresh complete');
        
        // Notify clients that cache has been refreshed
        const clients = await self.clients.matchAll({ type: 'window' });
        clients.forEach(client => {
            client.postMessage({
                type: 'CACHE_REFRESHED',
                message: 'All caches have been refreshed'
            });
        });
        
    } catch (error) {
        console.error('[Service Worker] Cache refresh failed:', error);
    }
}
