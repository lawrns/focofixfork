import { errorTracker } from './monitoring/error-tracker'

// Enhanced API client with timeout, retry, and caching support
interface ApiClientOptions {
  timeout?: number
  retries?: number
  retryDelay?: number
  useCache?: boolean
  cacheTime?: number
  headers?: Record<string, string>
}

class ApiClient {
  private cache = new Map<string, { data: any; timestamp: number }>()

  async fetch(url: string, options: RequestInit & ApiClientOptions = {}) {
    const {
      timeout = 10000, // 10 second timeout
      retries = 2,
      retryDelay = 1000,
      useCache = false,
      cacheTime = 5 * 60 * 1000, // 5 minutes
      ...fetchOptions
    } = options

    // If service worker is active, reduce client-side retries to avoid duplication
    // Service worker has its own circuit breaker and retry logic
    const effectiveRetries = (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) ? 0 : retries

    // Check cache first
    if (useCache) {
      const cached = this.cache.get(url)
      if (cached && (Date.now() - cached.timestamp) < cacheTime) {
        return { ok: true, data: cached.data }
      }
    }

    let lastError: Error | null = null

    for (let attempt = 0; attempt <= effectiveRetries; attempt++) {
      try {
        // Create AbortController for timeout
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), timeout)

        const response = await fetch(url, {
          ...fetchOptions,
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (response.ok) {
          const data = await response.json()

          // Cache successful responses
          if (useCache) {
            this.cache.set(url, { data, timestamp: Date.now() })
          }

          return { ok: true, data }
        } else if (response.status >= 500 && attempt < effectiveRetries) {
          // Retry on server errors
          lastError = new Error(`HTTP ${response.status}: ${response.statusText}`)
          if (attempt < effectiveRetries) {
            await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)))
            continue
          }
        } else {
          // Track non-retryable errors
          errorTracker.trackApiError(
            url,
            fetchOptions.method || 'GET',
            response.status,
            response.statusText,
            { headers: fetchOptions.headers }
          )

          // Don't retry on client errors
          return { ok: false, error: `HTTP ${response.status}: ${response.statusText}` }
        }
      } catch (error) {
        lastError = error as Error

        if (error instanceof Error && error.name === 'AbortError') {
          lastError = new Error('Request timeout')
        }

        if (attempt < effectiveRetries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)))
          continue
        }
      }
    }

    // Track final failure after all retries
    errorTracker.trackApiError(
      url,
      fetchOptions.method || 'GET',
      0,
      lastError?.message || 'Request failed',
      { retriesExhausted: true }
    )

    return { ok: false, error: lastError?.message || 'Request failed' }
  }

  // Clear cache
  clearCache() {
    this.cache.clear()
  }

  // Get cache size for debugging
  getCacheSize() {
    return this.cache.size
  }
}

export const apiClient = new ApiClient()

// Convenience function for GET requests
export async function apiGet(url: string, options?: ApiClientOptions) {
  return apiClient.fetch(url, { ...options, method: 'GET' })
}

// Convenience function for POST requests
export async function apiPost(url: string, data: any, options?: ApiClientOptions) {
  return apiClient.fetch(url, {
    ...options,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    body: JSON.stringify(data),
  })
}

// Convenience function for PUT requests
export async function apiPut(url: string, data: any, options?: ApiClientOptions) {
  return apiClient.fetch(url, {
    ...options,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    body: JSON.stringify(data),
  })
}

// Convenience function for DELETE requests
export async function apiDelete(url: string, options?: ApiClientOptions) {
  return apiClient.fetch(url, { ...options, method: 'DELETE' })
}
