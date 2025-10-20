/**
 * Centralized API client with retry logic and error handling
 */

interface ApiClientOptions {
  baseUrl?: string
  timeout?: number
  retries?: number
  retryDelay?: number
  onError?: (error: Error) => void
}

interface RequestOptions extends RequestInit {
  retries?: number
  timeout?: number
  silent?: boolean // Don't trigger error callbacks
}

class ApiClient {
  private baseUrl: string
  private timeout: number
  private defaultRetries: number
  private retryDelay: number
  private onError?: (error: Error) => void

  constructor(options: ApiClientOptions = {}) {
    this.baseUrl = options.baseUrl || ''
    this.timeout = options.timeout || 10000
    this.defaultRetries = options.retries || 1
    this.retryDelay = options.retryDelay || 1000
    this.onError = options.onError
  }

  async request<T = any>(
    endpoint: string, 
    options: RequestOptions = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    const retries = options.retries ?? this.defaultRetries
    const timeout = options.timeout ?? this.timeout

    let lastError: Error | null = null

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), timeout)

        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          // Don't retry on client errors (4xx)
          if (response.status >= 400 && response.status < 500) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
          }
          
          // Retry on server errors (5xx)
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()
        return data
      } catch (error) {
        lastError = error as Error
        
        // Don't retry on abort (timeout) or client errors
        if (error instanceof Error && (
          error.name === 'AbortError' || 
          error.message.includes('HTTP 4')
        )) {
          // Call error handler if not silent
          if (this.onError && !options.silent) {
            this.onError(error)
          }
          throw error
        }

        // Wait before retrying (exponential backoff)
        if (attempt < retries) {
          const delay = this.retryDelay * Math.pow(2, attempt)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }

    const finalError = lastError || new Error('Request failed after all retries')
    
    // Call error handler if not silent
    if (this.onError && !options.silent) {
      this.onError(finalError)
    }
    
    throw finalError
  }

  async get<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' })
  }

  async post<T = any>(endpoint: string, data?: any, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async put<T = any>(endpoint: string, data?: any, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async patch<T = any>(endpoint: string, data?: any, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async delete<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' })
  }
}

// Default API client instance
export const apiClient = new ApiClient({
  timeout: 10000,
  retries: 1,
  retryDelay: 1000,
})

// Export the class for custom instances
export { ApiClient }

// Convenience exports for common HTTP methods
export const apiGet = apiClient.get.bind(apiClient)
export const apiPost = apiClient.post.bind(apiClient)
export const apiPut = apiClient.put.bind(apiClient)
export const apiPatch = apiClient.patch.bind(apiClient)
export const apiDelete = apiClient.delete.bind(apiClient)