// Foco Service Worker - PWA functionality
const CACHE_NAME = 'foco-v1.0.0';
const STATIC_CACHE = 'foco-static-v1.0.0';
const DYNAMIC_CACHE = 'foco-dynamic-v1.0.0';
const API_CACHE = 'foco-api-v1.0.0';

// Resources to cache immediately
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/offline.html',
  '/icons/icon.svg',
  '/icons/manifest-icon-192.maskable.png',
  '/icons/manifest-icon-512.maskable.png',
];

// API endpoints to cache (GET requests only)
const API_ENDPOINTS = [
  '/api/health',
  '/api/user/profile',
  '/api/organizations',
  '/api/projects',
  '/api/milestones',
  '/api/tasks',
  '/api/goals',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker');
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      }),
      // Skip waiting to activate immediately
      self.skipWaiting()
    ])
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker');
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE && cacheName !== API_CACHE) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of all clients
      self.clients.claim()
    ])
  );
});

// Fetch event - handle requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle different types of requests
  if (request.method === 'GET') {
    if (isStaticAsset(request.url)) {
      // Cache-first for static assets
      event.respondWith(cacheFirst(request));
    } else if (isApiRequest(request.url)) {
      // Network-first for API calls
      event.respondWith(networkFirst(request));
    } else if (isImageRequest(request.url)) {
      // Cache-first for images
      event.respondWith(cacheFirst(request));
    } else {
      // Network-first for pages, fallback to offline page
      event.respondWith(networkFirst(request, '/offline.html'));
    }
  }
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);

  if (event.tag === 'background-sync') {
    event.waitUntil(syncOfflineData());
  }
});

// Push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');

  if (event.data) {
    const data = event.data.json();

    const options = {
      body: data.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      vibrate: [100, 50, 100],
      data: {
        url: data.url || '/',
        action: data.action,
      },
      actions: [
        {
          action: 'view',
          title: 'View',
        },
        {
          action: 'dismiss',
          title: 'Dismiss',
        },
      ],
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'Foco', options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);

  event.notification.close();

  if (event.action === 'view') {
    const url = event.notification.data?.url || '/';
    event.waitUntil(
      clients.openWindow(url)
    );
  }
  // dismiss action is handled automatically
});

// Helper functions
function isStaticAsset(url) {
  const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2'];
  return staticExtensions.some(ext => url.includes(ext)) || STATIC_ASSETS.includes(url);
}

function isApiRequest(url) {
  return url.includes('/api/') && !url.includes('/auth/');
}

function isImageRequest(url) {
  return /\.(png|jpg|jpeg|gif|svg|webp|ico)$/i.test(url);
}

// Validation helper to check if request/response is cacheable
function isCacheable(request, response) {
  // Only cache HTTP/HTTPS requests (filter out chrome-extension://, blob:, data:, etc.)
  if (!request.url.startsWith('http://') && !request.url.startsWith('https://')) {
    return false;
  }

  // Only cache successful responses (status 200)
  // Skip partial responses (206), redirects (301, 302), not modified (304), errors (404, 500, etc.)
  if (!response || response.status !== 200 || response.type === 'error') {
    return false;
  }

  return true;
}

// Cache strategies
async function cacheFirst(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    const networkResponse = await fetch(request);

    // Only cache if request and response are cacheable
    if (isCacheable(request, networkResponse)) {
      try {
        const cache = await caches.open(STATIC_CACHE);
        await cache.put(request, networkResponse.clone());
      } catch (cacheError) {
        // Silently ignore caching errors (e.g., quota exceeded, unsupported schemes)
        console.debug('[SW] Cache put failed:', cacheError.message);
      }
    }

    return networkResponse;
  } catch (error) {
    // Network failed, try to return cached response
    console.debug('[SW] Network failed in cacheFirst:', error.message);
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    // Re-throw if no cache available
    throw error;
  }
}

async function networkFirst(request, fallbackUrl = '/offline.html') {
  try {
    const networkResponse = await fetch(request);

    // Log API errors for debugging
    if (isApiRequest(request.url) && !networkResponse.ok) {
      console.warn(`[SW] API request failed: ${request.url} - Status: ${networkResponse.status} ${networkResponse.statusText}`);
    }

    // Only cache if request and response are cacheable
    if (request.method === 'GET' && isCacheable(request, networkResponse)) {
      try {
        const cache = await caches.open(isApiRequest(request.url) ? API_CACHE : DYNAMIC_CACHE);
        await cache.put(request, networkResponse.clone());
      } catch (cacheError) {
        // Silently ignore caching errors (e.g., quota exceeded, partial responses, unsupported schemes)
        console.debug('[SW] Cache put failed:', cacheError.message);
      }
    }

    return networkResponse;
  } catch (error) {
    // Network failed, try cache fallback
    const errorType = error.name || 'NetworkError';
    console.warn(`[SW] ${errorType} in networkFirst for ${request.url}:`, error.message);

    // Try cache first
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.debug(`[SW] Serving cached response for ${request.url}`);
      return cachedResponse;
    }

    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      try {
        const cache = await caches.open(STATIC_CACHE);
        const offlineResponse = await cache.match(fallbackUrl);
        if (offlineResponse) {
          return offlineResponse;
        }
      } catch (cacheError) {
        console.debug('[SW] Failed to get offline page:', cacheError.message);
      }
      // Final fallback
      return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
    }

    // For non-navigation requests, return a more informative error response
    // instead of throwing, to prevent uncaught promise rejections
    console.debug(`[SW] Returning error response for ${request.url}`);
    return new Response(JSON.stringify({ error: 'Network request failed', url: request.url }), {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Background sync implementation
async function syncOfflineData() {
  console.log('[SW] Syncing offline data');

  try {
    // Get offline actions from IndexedDB or localStorage
    const offlineActions = getOfflineActions();

    for (const action of offlineActions) {
      try {
        await fetch(action.url, {
          method: action.method,
          headers: action.headers,
          body: action.body,
        });

        // Remove successful action from offline storage
        removeOfflineAction(action.id);
      } catch (error) {
        console.log('[SW] Failed to sync action:', action.id, error);
        // Keep failed actions for retry
      }
    }

    // Notify client that sync is complete
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        success: true,
      });
    });

  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

// Offline data management (simplified)
function getOfflineActions() {
  try {
    const actions = localStorage.getItem('foco_offline_actions');
    return actions ? JSON.parse(actions) : [];
  } catch {
    return [];
  }
}

function removeOfflineAction(actionId) {
  try {
    const actions = getOfflineActions();
    const filtered = actions.filter(action => action.id !== actionId);
    localStorage.setItem('foco_offline_actions', JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to remove offline action:', error);
  }
}

// Periodic background sync (if supported)
if ('periodicSync' in self.registration) {
  self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'content-sync') {
      event.waitUntil(syncContent());
    }
  });
}

async function syncContent() {
  console.log('[SW] Periodic content sync');

  try {
    // Sync user data, notifications, etc.
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'CONTENT_SYNC',
        timestamp: Date.now(),
      });
    });
  } catch (error) {
    console.error('[SW] Periodic sync failed:', error);
  }
}

// Message handling for client communication
self.addEventListener('message', (event) => {
  const { type, data } = event.data;

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'GET_VERSION':
      event.ports[0].postMessage({ version: CACHE_NAME });
      break;

    case 'CLEAR_CACHE':
      clearAllCaches();
      break;

    default:
      console.log('[SW] Unknown message type:', type);
  }
});

async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames.map(cacheName => caches.delete(cacheName))
  );

  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({
      type: 'CACHE_CLEARED',
    });
  });
}
