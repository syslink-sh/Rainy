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
    '/css/style.css',
    '/js/config.js',
    '/js/main.js',
    '/manifest.json',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    if (DEBUG) console.log('[Service Worker] Installing...');
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => {
                if (DEBUG) console.log('[Service Worker] Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => self.skipWaiting())
            .catch((err) => {
                console.error('[Service Worker] Failed to cache static assets:', err);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    if (DEBUG) console.log('[Service Worker] Activating...');
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((cacheName) => {
                            return cacheName !== STATIC_CACHE && 
                                   cacheName !== DYNAMIC_CACHE &&
                                   cacheName.startsWith('rainy-');
                        })
                        .map((cacheName) => {
                            if (DEBUG) console.log('[Service Worker] Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        })
                );
            })
            .then(() => self.clients.claim())
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Skip chrome-extension and other non-http(s) requests
    if (!url.protocol.startsWith('http')) {
        return;
    }

    // API requests - Network only, never cache (weather data must be fresh)
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(networkOnlyStrategy(request));
        return;
    }

    // External resources (CDN) - Cache first, then network
    if (url.origin !== location.origin) {
        event.respondWith(cacheFirstStrategy(request));
        return;
    }

    // Static assets - Cache first, then network
    event.respondWith(cacheFirstStrategy(request));
});

// Network only strategy (for API calls - weather must always be fresh)
async function networkOnlyStrategy(request) {
    try {
        return await fetch(request);
    } catch (error) {
        if (DEBUG) console.log('[Service Worker] Network failed for API:', request.url);
        
        // Return offline error for weather API
        if (request.url.includes('/api/weather')) {
            return new Response(
                JSON.stringify({
                    error: 'offline',
                    message: 'Weather data unavailable offline. Please check your connection.'
                }),
                {
                    status: 503,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }
        
        // Generic offline error for other API endpoints
        return new Response(
            JSON.stringify({
                error: 'offline',
                message: 'You are offline. Please check your connection.'
            }),
            {
                status: 503,
                headers: { 'Content-Type': 'application/json' }
            }
        );
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
