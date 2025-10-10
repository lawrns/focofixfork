// Enhanced API client with timeout, retry, and caching support
interface ApiClientOptions {
  timeout?: number
  retries?: number
  retryDelay?: number
  cache?: boolean
  cacheTime?: number
}

class ApiClient {
  private cache = new Map<string, { data: any; timestamp: number }>()

  async fetch(url: string, options: RequestInit & ApiClientOptions = {}) {
    const {
      timeout = 10000, // 10 second timeout
      retries = 2,
      retryDelay = 1000,
      cache = false,
      cacheTime = 5 * 60 * 1000, // 5 minutes
      ...fetchOptions
    } = options

    // Check cache first
    if (cache) {
      const cached = this.cache.get(url)
      if (cached && (Date.now() - cached.timestamp) < cacheTime) {
        return { ok: true, data: cached.data }
      }
    }

    let lastError: Error | null = null

    for (let attempt = 0; attempt <= retries; attempt++) {
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
          if (cache) {
            this.cache.set(url, { data, timestamp: Date.now() })
          }

          return { ok: true, data }
        } else if (response.status >= 500 && attempt < retries) {
          // Retry on server errors
          lastError = new Error(`HTTP ${response.status}: ${response.statusText}`)
          if (attempt < retries) {
            await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)))
            continue
          }
        } else {
          // Don't retry on client errors
          return { ok: false, error: `HTTP ${response.status}: ${response.statusText}` }
        }
      } catch (error) {
        lastError = error as Error

        if (error instanceof Error && error.name === 'AbortError') {
          lastError = new Error('Request timeout')
        }

        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)))
          continue
        }
      }
    }

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
