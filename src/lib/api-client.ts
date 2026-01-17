/**
 * Shared API Client with Automatic Retry and Caching
 * Provides a unified interface for API calls with built-in error handling
 * Features:
 * - Exponential backoff retry logic (especially for 429 rate limits)
 * - Automatic response caching with TTL
 * - Timeout handling with AbortController
 * - User-friendly error messages
 */

import { apiCache } from './api-cache'
import { PWAService } from './services/pwa'

interface ApiClientOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  headers?: Record<string, string>
  body?: any
  timeout?: number
  retries?: number
  cache?: boolean
  cacheTTL?: number
  forceRefresh?: boolean
  onRetry?: (attempt: number, waitTime: number) => void
}

interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  status?: number
  retryAfter?: number
}

interface RateLimitInfo {
  remaining: number
  limit: number
  resetTime: number
}

class ApiClient {
  private defaultTimeout = 10000 // 10 seconds
  private defaultRetries = 3 // Increased to 3 for better rate limit handling
  private defaultCacheTTL = 30000 // 30 seconds
  private maxBackoffTime = 32000 // Max backoff of 32 seconds (2^5 * 1000)
  private rateLimitInfo: Map<string, RateLimitInfo> = new Map()

  /**
   * Calculate exponential backoff time with jitter
   */
  private calculateBackoffTime(attempt: number, retryAfterHeader?: string): number {
    // If server provided Retry-After, use that
    if (retryAfterHeader) {
      const retryAfter = parseInt(retryAfterHeader, 10)
      if (!isNaN(retryAfter)) {
        return retryAfter * 1000 // Convert to milliseconds
      }
    }

    // Use exponential backoff: 2^attempt * 1000ms
    const exponentialTime = Math.pow(2, attempt) * 1000
    const cappedTime = Math.min(exponentialTime, this.maxBackoffTime)

    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 1000 // 0-1000ms jitter
    return cappedTime + jitter
  }

  /**
   * Extract rate limit information from response headers
   */
  private extractRateLimitInfo(headers: Response['headers']): RateLimitInfo | null {
    const remaining = headers.get('x-ratelimit-remaining')
    const limit = headers.get('x-ratelimit-limit')
    const resetTime = headers.get('x-ratelimit-reset')

    if (!remaining || !limit || !resetTime) {
      return null
    }

    return {
      remaining: parseInt(remaining, 10),
      limit: parseInt(limit, 10),
      resetTime: parseInt(resetTime, 10),
    }
  }

  /**
   * Check if rate limit availability is low
   */
  private isRateLimitLow(info: RateLimitInfo): boolean {
    const percentage = (info.remaining / info.limit) * 100
    return percentage < 10 // Less than 10% remaining
  }

  /**
   * Should retry on this status code?
   */
  private shouldRetry(statusCode: number): boolean {
    // Always retry on 429 (Too Many Requests)
    if (statusCode === 429) {
      return true
    }
    // Retry on 5xx server errors
    if (statusCode >= 500) {
      return true
    }
    // Don't retry on other client errors
    return false
  }

  /**
   * Get user-friendly error message for rate limiting
   */
  private getRateLimitErrorMessage(retryAfter?: number): string {
    if (retryAfter) {
      const seconds = Math.ceil(retryAfter / 1000)
      if (seconds === 1) {
        return 'Too many requests. Retrying in 1 second...'
      }
      return `Too many requests. Retrying in ${seconds} seconds...`
    }
    return 'Too many requests. Please wait before trying again.'
  }

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
      onRetry,
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
    let lastResponse: Response | null = null

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
          credentials: 'include',
        }

        if (body && method !== 'GET') {
          fetchOptions.body = JSON.stringify(body)
        }

        const response = await fetch(url, fetchOptions)
        clearTimeout(timeoutId)
        lastResponse = response

        // Handle offline scenario for mutations
        if (!response.ok && !PWAService.isOnline && method !== 'GET') {
          await PWAService.queueOfflineAction({
            url,
            method: method as any,
            headers: {
              ...headers,
              'Content-Type': 'application/json'
            },
            body
          })
          return {
            success: true, // Return success as it's queued
            data: { queued: true } as any,
            status: 202 // Accepted
          }
        }

        // Extract and store rate limit info
        const rateLimitInfo = this.extractRateLimitInfo(response.headers)
        if (rateLimitInfo) {
          this.rateLimitInfo.set(url, rateLimitInfo)
        }

        // Try to parse response
        let data: any
        try {
          data = await response.json()
        } catch {
          data = null
        }

        if (response.ok) {
          // Cache successful responses
          if (cache && method === 'GET') {
            apiCache.set(url, data || {}, cacheTTL)
          }

          return {
            success: true,
            data: data || {},
            status: response.status,
          }
        } else {
          // Handle rate limiting (429) with exponential backoff
          if (attempt < retries && this.shouldRetry(response.status)) {
            const retryAfterHeader = response.headers.get('retry-after')
            const backoffTime = this.calculateBackoffTime(attempt, retryAfterHeader)

            // Notify caller about retry
            if (onRetry) {
              onRetry(attempt + 1, backoffTime)
            }

            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, backoffTime))
            continue
          }

          // Return error response
          const errorMessage = response.status === 429
            ? this.getRateLimitErrorMessage()
            : (data?.message || data?.error || `HTTP ${response.status}`)

          return {
            success: false,
            error: errorMessage,
            status: response.status,
            retryAfter: response.status === 429 ? parseInt(response.headers.get('retry-after') || '0', 10) : undefined,
          }
        }
      } catch (error: any) {
        lastError = error

        // Don't retry on abort (timeout) or if no more retries
        if (error.name === 'AbortError') {
          return {
            success: false,
            error: 'Request timeout',
          }
        }

        // Retry on network errors with exponential backoff
        if (attempt < retries && error.name !== 'AbortError') {
          const backoffTime = this.calculateBackoffTime(attempt)

          if (onRetry) {
            onRetry(attempt + 1, backoffTime)
          }

          await new Promise(resolve => setTimeout(resolve, backoffTime))
          continue
        }
      }
    }

    // All retries exhausted
    if (lastResponse?.status === 429) {
      return {
        success: false,
        error: 'Too many requests. Maximum retries exceeded.',
        status: 429,
      }
    }

    return {
      success: false,
      error: lastError?.message || 'Request failed after all retries',
    }
  }

  /**
   * Get cached rate limit info for a URL
   */
  getRateLimitInfo(url: string): RateLimitInfo | null {
    return this.rateLimitInfo.get(url) || null
  }

  /**
   * Check if approaching rate limit
   */
  isApproachingRateLimit(url: string): boolean {
    const info = this.rateLimitInfo.get(url)
    return info ? this.isRateLimitLow(info) : false
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
