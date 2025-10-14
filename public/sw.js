// Service Worker Version
const SW_VERSION = '1.0.21'
const CACHE_PREFIX = 'foco-cache-'
const STATIC_CACHE = `${CACHE_PREFIX}static-v${SW_VERSION}`
const DYNAMIC_CACHE = `${CACHE_PREFIX}dynamic-v${SW_VERSION}`
const API_CACHE = `${CACHE_PREFIX}api-v${SW_VERSION}`

// Circuit breaker for failing endpoints
const circuitBreaker = new Map() // URL -> { failures: number, nextRetry: number, isOpen: boolean }

// Circuit breaker settings
const CIRCUIT_BREAKER_CONFIG = {
  maxFailures: 3,           // Open circuit after 3 failures
  resetTimeout: 60000,      // Reset circuit after 1 minute
  halfOpenTimeout: 30000,   // Try again after 30 seconds
}

// Files to cache during install
const STATIC_FILES = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/favicon.ico',
]

// Install event - cache static assets
self.addEventListener('install', async (event) => {
  console.log('[SW] Installing service worker version:', SW_VERSION)

  event.waitUntil(
    caches.open(STATIC_CACHE).then(async (cache) => {
      // Cache static files individually with error handling
      for (const file of STATIC_FILES) {
        try {
          await cache.add(file)
        } catch (error) {
          console.warn(`[SW] Failed to cache ${file}:`, error)
        }
      }
      console.log('[SW] Static files cached')

      // Skip waiting and activate immediately
      await self.skipWaiting()
    })
  )
})

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker version:', SW_VERSION)

  event.waitUntil(
    (async () => {
      // Clean up old caches
      const cacheNames = await caches.keys()
      const oldCaches = cacheNames.filter(name =>
        name.startsWith(CACHE_PREFIX) &&
        !name.includes(`v${SW_VERSION}`)
      )

      for (const cacheName of oldCaches) {
        console.log('[SW] Deleting old cache:', cacheName)
        await caches.delete(cacheName)
      }

      // Take control of all clients immediately
      await self.clients.claim()
      console.log('[SW] Service worker activated and claimed clients')
    })()
  )
})

// Fetch event - handle network requests
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip chrome-extension and other non-http(s) protocols
  if (!url.protocol.startsWith('http')) {
    return
  }

  // Skip requests to different origins
  if (url.origin !== self.location.origin) {
    return
  }

  // Handle API requests with circuit breaker
  if (isApiRequest(request.url)) {
    // Check circuit breaker first
    const breaker = getCircuitBreakerState(request.url)
    if (breaker.isOpen) {
      console.warn(`[SW] Circuit breaker OPEN for ${request.url}`)
      event.respondWith(
        new Response(
          JSON.stringify({
            error: 'Service temporarily unavailable. Please try again later.',
            retryAfter: Math.ceil((breaker.nextRetry - Date.now()) / 1000)
          }),
          {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'application/json' }
          }
        )
      )
      return
    }

    event.respondWith(networkFirstWithCircuitBreaker(request))
    return
  }

  // Handle static assets with cache-first strategy
  if (isStaticAsset(request.url)) {
    event.respondWith(cacheFirst(request))
    return
  }

  // Handle everything else with network-first strategy
  event.respondWith(networkFirst(request))
})

// Circuit breaker functions
function getCircuitBreakerState(url) {
  // Normalize URL by removing query params for circuit breaker
  const baseUrl = url.split('?')[0]

  if (!circuitBreaker.has(baseUrl)) {
    circuitBreaker.set(baseUrl, {
      failures: 0,
      nextRetry: 0,
      isOpen: false
    })
  }

  const state = circuitBreaker.get(baseUrl)

  // Check if circuit should be reset
  if (state.isOpen && Date.now() >= state.nextRetry) {
    console.log(`[SW] Circuit breaker entering HALF-OPEN state for ${baseUrl}`)
    state.isOpen = false
    state.failures = Math.floor(state.failures / 2) // Reduce failures count when trying again
  }

  return state
}

function recordSuccess(url) {
  const baseUrl = url.split('?')[0]
  const state = circuitBreaker.get(baseUrl)

  if (state) {
    state.failures = 0
    state.isOpen = false
    state.nextRetry = 0
    console.log(`[SW] Circuit breaker CLOSED for ${baseUrl}`)
  }
}

function recordFailure(url) {
  const baseUrl = url.split('?')[0]
  const state = getCircuitBreakerState(url)

  state.failures++

  if (state.failures >= CIRCUIT_BREAKER_CONFIG.maxFailures) {
    state.isOpen = true
    state.nextRetry = Date.now() + CIRCUIT_BREAKER_CONFIG.halfOpenTimeout
    console.warn(`[SW] Circuit breaker OPEN for ${baseUrl} after ${state.failures} failures`)
  } else {
    console.warn(`[SW] Failure ${state.failures}/${CIRCUIT_BREAKER_CONFIG.maxFailures} for ${baseUrl}`)
  }
}

// Network strategies with circuit breaker
async function networkFirstWithCircuitBreaker(request) {
  try {
    const response = await fetch(request)

    if (!response.ok) {
      // Record failure for 5xx errors and 404s (indicating access issues)
      if (response.status >= 500 || response.status === 404) {
        recordFailure(request.url)
      }

      // Log but don't retry failed API requests
      console.warn(`[SW] API request failed: ${request.url} - Status: ${response.status}`)
      return response // Return the error response to the client
    }

    // Record success
    recordSuccess(request.url)

    // Cache successful GET responses
    if (request.method === 'GET') {
      try {
        const cache = await caches.open(API_CACHE)
        await cache.put(request, response.clone())
      } catch (cacheError) {
        console.debug('[SW] Cache put failed:', cacheError.message)
      }
    }

    return response
  } catch (error) {
    // Network failed, record failure
    recordFailure(request.url)
    console.error(`[SW] Network error for ${request.url}:`, error.message)

    // Try cache fallback for GET requests
    if (request.method === 'GET') {
      const cachedResponse = await caches.match(request)
      if (cachedResponse) {
        console.log(`[SW] Serving cached response for ${request.url}`)
        return cachedResponse
      }
    }

    // Return offline response
    return new Response(
      JSON.stringify({
        error: 'Network error. Please check your connection.',
        offline: true
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

// Helper functions
function isApiRequest(url) {
  return url.includes('/api/') ||
         url.includes('supabase.co/rest/') ||
         url.includes('supabase.co/auth/')
}

function isStaticAsset(url) {
  return url.includes('/_next/static/') ||
         url.includes('/images/') ||
         url.includes('/fonts/') ||
         url.endsWith('.css') ||
         url.endsWith('.js') ||
         url.endsWith('.woff') ||
         url.endsWith('.woff2') ||
         url.endsWith('.ttf') ||
         url.endsWith('.otf')
}

function isCacheable(request, response) {
  // Only cache successful GET requests
  if (request.method !== 'GET') return false
  if (!response.ok) return false

  // Don't cache auth-related responses
  if (request.url.includes('/auth/')) return false

  // Check response headers
  const cacheControl = response.headers.get('cache-control')
  if (cacheControl) {
    if (cacheControl.includes('no-store')) return false
    if (cacheControl.includes('no-cache')) return false
    if (cacheControl.includes('private')) return false
  }

  // Don't cache partial content
  if (response.status === 206) return false

  return true
}

async function cacheFirst(request) {
  try {
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }

    const networkResponse = await fetch(request)

    if (networkResponse.ok && isCacheable(request, networkResponse)) {
      try {
        const cache = await caches.open(STATIC_CACHE)
        await cache.put(request, networkResponse.clone())
      } catch (cacheError) {
        console.debug('[SW] Cache put failed:', cacheError.message)
      }
    }

    return networkResponse
  } catch (error) {
    console.debug('[SW] Network failed in cacheFirst:', error.message)
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    throw error
  }
}

async function networkFirst(request, fallbackUrl = '/offline.html') {
  try {
    const networkResponse = await fetch(request)

    // Only cache successful responses
    if (request.method === 'GET' && networkResponse.ok && isCacheable(request, networkResponse)) {
      try {
        const cache = await caches.open(DYNAMIC_CACHE)
        await cache.put(request, networkResponse.clone())
      } catch (cacheError) {
        console.debug('[SW] Cache put failed:', cacheError.message)
      }
    }

    return networkResponse
  } catch (error) {
    const errorType = error.name || 'NetworkError'
    console.warn(`[SW] ${errorType} in networkFirst for ${request.url}:`, error.message)

    // Try cache first
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      console.debug(`[SW] Serving cached response for ${request.url}`)
      return cachedResponse
    }

    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      try {
        const cache = await caches.open(STATIC_CACHE)
        const offlineResponse = await cache.match(fallbackUrl)
        if (offlineResponse) {
          return offlineResponse
        }
      } catch (cacheError) {
        console.debug('[SW] Failed to retrieve offline page:', cacheError.message)
      }
    }

    // Return a basic offline response
    return new Response('Offline - Please check your connection', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: new Headers({
        'Content-Type': 'text/plain'
      })
    })
  }
}

// Message handler for cache operations
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(name => name.startsWith(CACHE_PREFIX))
            .map(name => caches.delete(name))
        )
      }).then(() => {
        console.log('[SW] All caches cleared')
        // Also clear circuit breaker state
        circuitBreaker.clear()
      })
    )
  }

  if (event.data && event.data.type === 'RESET_CIRCUIT_BREAKER') {
    const url = event.data.url
    if (url) {
      const baseUrl = url.split('?')[0]
      circuitBreaker.delete(baseUrl)
      console.log(`[SW] Circuit breaker reset for ${baseUrl}`)
    } else {
      circuitBreaker.clear()
      console.log('[SW] All circuit breakers reset')
    }
  }
})

console.log('[SW] Service worker loaded, version:', SW_VERSION)