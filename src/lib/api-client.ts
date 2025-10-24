/**
 * Shared API Client with Automatic Retry and Caching
 * Provides a unified interface for API calls with built-in error handling
 */

import { apiCache } from './api-cache'

interface ApiClientOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  headers?: Record<string, string>
  body?: any
  timeout?: number
  retries?: number
  cache?: boolean
  cacheTTL?: number
  forceRefresh?: boolean
}

interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  status?: number
}

class ApiClient {
  private defaultTimeout = 10000 // 10 seconds
  private defaultRetries = 2
  private defaultCacheTTL = 30000 // 30 seconds

  /**
   * Make an API request with automatic retry and caching
   */
  async request<T = any>(
    url: string,
    options: ApiClientOptions = {}
  ): Promise<ApiResponse<T>> {
    const {
      method = 'GET',
      headers = {},
      body,
      timeout = this.defaultTimeout,
      retries = this.defaultRetries,
      cache = true,
      cacheTTL = this.defaultCacheTTL,
      forceRefresh = false,
    } = options

    // Check cache first
    if (cache && method === 'GET' && !forceRefresh) {
      const cachedData = apiCache.get<T>(url)
      if (cachedData) {
        return {
          success: true,
          data: cachedData,
        }
      }
    }

    // Perform request with retry logic
    let lastError: Error | null = null
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), timeout)

        const fetchOptions: RequestInit = {
          method,
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
          signal: controller.signal,
        }

        if (body && method !== 'GET') {
          fetchOptions.body = JSON.stringify(body)
        }

        const response = await fetch(url, fetchOptions)
        clearTimeout(timeoutId)

        const data = await response.json()

        if (response.ok) {
          // Cache successful responses
          if (cache && method === 'GET') {
            apiCache.set(url, data, cacheTTL)
          }

          return {
            success: true,
            data,
            status: response.status,
          }
        } else {
          // For non-200 responses, check if we should retry
          if (attempt < retries && response.status >= 500) {
            // Retry on server errors
            continue
          }

          return {
            success: false,
            error: data.message || `HTTP ${response.status}`,
            status: response.status,
          }
        }
      } catch (error: any) {
        lastError = error

        // Don't retry on abort (timeout)
        if (error.name === 'AbortError') {
          return {
            success: false,
            error: 'Request timeout',
          }
        }

        // Retry on network errors
        if (attempt < retries && error.name !== 'AbortError') {
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000))
          continue
        }
      }
    }

    return {
      success: false,
      error: lastError?.message || 'Request failed',
    }
  }

  /**
   * GET request
   */
  async get<T = any>(url: string, options: Omit<ApiClientOptions, 'method'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...options, method: 'GET' })
  }

  /**
   * POST request
   */
  async post<T = any>(url: string, body: any, options: Omit<ApiClientOptions, 'method' | 'body'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...options, method: 'POST', body })
  }

  /**
   * PUT request
   */
  async put<T = any>(url: string, body: any, options: Omit<ApiClientOptions, 'method' | 'body'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...options, method: 'PUT', body })
  }

  /**
   * DELETE request
   */
  async delete<T = any>(url: string, options: Omit<ApiClientOptions, 'method'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...options, method: 'DELETE' })
  }

  /**
   * PATCH request
   */
  async patch<T = any>(url: string, body: any, options: Omit<ApiClientOptions, 'method' | 'body'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...options, method: 'PATCH', body })
  }

  /**
   * Invalidate cache for a specific URL
   */
  invalidateCache(url: string): void {
    apiCache.delete(url)
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    apiCache.clear()
  }
}

// Singleton instance
export const apiClient = new ApiClient()

// Export for backward compatibility
export const apiGet = apiClient.get.bind(apiClient)
export const apiPost = apiClient.post.bind(apiClient)
export const apiPut = apiClient.put.bind(apiClient)
export const apiDelete = apiClient.delete.bind(apiClient)
export const apiPatch = apiClient.patch.bind(apiClient)
