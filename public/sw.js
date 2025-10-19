// Service Worker for Foco PWA
// Version 1.0.0

const CACHE_NAME = 'foco-v1.0.0'
const STATIC_CACHE = 'foco-static-v1.0.0'
const DYNAMIC_CACHE = 'foco-dynamic-v1.0.0'

// Critical resources to cache immediately
const CRITICAL_RESOURCES = [
  '/',
  '/dashboard',
  '/login',
  '/register',
  '/manifest.json',
  '/offline.html'
]

// API routes that should be cached
const API_CACHE_ROUTES = [
  '/api/projects',
  '/api/tasks',
  '/api/organizations',
  '/api/user/settings'
]

// Install event - cache critical resources
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...')
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching critical resources')
        return cache.addAll(CRITICAL_RESOURCES)
      })
      .then(() => {
        console.log('[SW] Critical resources cached successfully')
        return self.skipWaiting()
      })
      .catch((error) => {
        console.error('[SW] Failed to cache critical resources:', error)
      })
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...')
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('[SW] Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      })
      .then(() => {
        console.log('[SW] Service worker activated')
        return self.clients.claim()
      })
  )
})

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }

  // Handle different types of requests
  if (url.pathname.startsWith('/api/')) {
    // API requests - Network first with cache fallback
    event.respondWith(handleApiRequest(request))
  } else if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/static/')) {
    // Static assets - Cache first
    event.respondWith(handleStaticRequest(request))
  } else if (url.pathname.startsWith('/images/') || url.pathname.startsWith('/icons/')) {
    // Images - Cache first with fallback
    event.respondWith(handleImageRequest(request))
  } else {
    // Page requests - Network first with cache fallback
    event.respondWith(handlePageRequest(request))
  }
})

// API request handler - Network first with cache fallback
async function handleApiRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(DYNAMIC_CACHE)
      cache.put(request, networkResponse.clone())
      return networkResponse
    }
    
    throw new Error('Network response not ok')
  } catch (error) {
    console.log('[SW] Network failed for API request, trying cache:', request.url)
    
    // Fallback to cache
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    
    // Return offline response for API requests
    return new Response(
      JSON.stringify({ 
        error: 'Offline', 
        message: 'This request is not available offline' 
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

// Static asset handler - Cache first
async function handleStaticRequest(request) {
  const cachedResponse = await caches.match(request)
  
  if (cachedResponse) {
    return cachedResponse
  }
  
  try {
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE)
      cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch (error) {
    console.error('[SW] Failed to fetch static asset:', request.url)
    return new Response('Asset not available offline', { status: 503 })
  }
}

// Image request handler - Cache first with fallback
async function handleImageRequest(request) {
  const cachedResponse = await caches.match(request)
  
  if (cachedResponse) {
    return cachedResponse
  }
  
  try {
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE)
      cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch (error) {
    // Return placeholder image for offline
    return new Response(
      '<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="200" fill="#f3f4f6"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#6b7280">Image offline</text></svg>',
      {
        headers: { 'Content-Type': 'image/svg+xml' }
      }
    )
  }
}

// Page request handler - Network first with cache fallback
async function handlePageRequest(request) {
  try {
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE)
      cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch (error) {
    console.log('[SW] Network failed for page request, trying cache:', request.url)
    
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    
    // Return offline page
    const offlineResponse = await caches.match('/offline.html')
    if (offlineResponse) {
      return offlineResponse
    }
    
    // Fallback offline page
    return new Response(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Offline - Foco</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: system-ui; text-align: center; padding: 2rem; }
            .offline-icon { font-size: 4rem; margin-bottom: 1rem; }
          </style>
        </head>
        <body>
          <div class="offline-icon">📱</div>
          <h1>You're offline</h1>
          <p>Check your internet connection and try again.</p>
          <button onclick="window.location.reload()">Retry</button>
        </body>
      </html>
      `,
      {
        headers: { 'Content-Type': 'text/html' }
      }
    )
  }
}

// Background sync for failed requests
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag)
  
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync())
  }
})

// Background sync implementation
async function doBackgroundSync() {
  try {
    // Get pending requests from IndexedDB
    const pendingRequests = await getPendingRequests()
    
    for (const request of pendingRequests) {
      try {
        const response = await fetch(request.url, {
          method: request.method,
          headers: request.headers,
          body: request.body
        })
        
        if (response.ok) {
          // Remove from pending requests
          await removePendingRequest(request.id)
          console.log('[SW] Synced request:', request.url)
        }
      } catch (error) {
        console.error('[SW] Failed to sync request:', request.url, error)
      }
    }
  } catch (error) {
    console.error('[SW] Background sync failed:', error)
  }
}

// Message handling for communication with main thread
self.addEventListener('message', (event) => {
  const { type, data } = event.data
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting()
      break
      
    case 'CACHE_URLS':
      cacheUrls(data.urls)
      break
      
    case 'CLEAR_CACHE':
      clearCache(data.cacheName)
      break
      
    case 'GET_CACHE_STATUS':
      getCacheStatus().then(status => {
        event.ports[0].postMessage(status)
      })
      break
  }
})

// Helper functions
async function cacheUrls(urls) {
  const cache = await caches.open(DYNAMIC_CACHE)
  await cache.addAll(urls)
}

async function clearCache(cacheName) {
  await caches.delete(cacheName)
}

async function getCacheStatus() {
  const cacheNames = await caches.keys()
  const status = {}
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName)
    const keys = await cache.keys()
    status[cacheName] = keys.length
  }
  
  return status
}

// IndexedDB helpers for pending requests
async function getPendingRequests() {
  // This would integrate with IndexedDB
  // For now, return empty array
  return []
}

async function removePendingRequest(id) {
  // This would remove from IndexedDB
  // For now, no-op
}

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received')
  
  const options = {
    body: event.data ? event.data.text() : 'You have a new notification',
    icon: '/icons/manifest-icon-192.maskable.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'View in Foco',
        icon: '/icons/checkmark.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icons/xmark.png'
      }
    ]
  }
  
  event.waitUntil(
    self.registration.showNotification('Foco', options)
  )
})

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action)
  
  event.notification.close()
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/dashboard')
    )
  }
})

console.log('[SW] Service worker loaded successfully')