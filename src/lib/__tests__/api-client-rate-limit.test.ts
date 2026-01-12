import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { apiClient } from '../api-client'

describe('API Client Rate Limit Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('429 Rate Limit Response Handling', () => {
    it('should retry on 429 Too Many Requests response', async () => {
      let callCount = 0
      global.fetch = vi.fn(() => {
        callCount++
        if (callCount === 1) {
          return Promise.resolve({
            ok: false,
            status: 429,
            headers: new Map(),
            json: async () => ({ error: 'Too many requests' })
          } as Response)
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Map(),
          json: async () => ({ success: true, data: { id: '123' } })
        } as Response)
      })

      const response = await apiClient.get('/api/test', { retries: 1 })
      expect(response.success).toBe(true)
      expect(callCount).toBeGreaterThan(1) // Should have retried
    }, { timeout: 15000 })

    it('should fail after maximum retries on 429', async () => {
      global.fetch = vi.fn(() => {
        return Promise.resolve({
          ok: false,
          status: 429,
          headers: new Map(),
          json: async () => ({ error: 'Too many requests' })
        } as Response)
      })

      const response = await apiClient.get('/api/test', { retries: 1 })

      expect(response.success).toBe(false)
      expect(response.status).toBe(429)
      expect(global.fetch).toHaveBeenCalledTimes(2) // Initial + 1 retry
    }, { timeout: 15000 })

    it('should not retry on 429 if retries is set to 0', async () => {
      global.fetch = vi.fn(() => {
        return Promise.resolve({
          ok: false,
          status: 429,
          headers: new Map(),
          json: async () => ({ error: 'Too many requests' })
        } as Response)
      })

      const response = await apiClient.get('/api/test', { retries: 0 })

      expect(response.success).toBe(false)
      expect(global.fetch).toHaveBeenCalledTimes(1) // Only initial attempt
    })

    it('should include rate limit error in response', async () => {
      global.fetch = vi.fn(() => {
        return Promise.resolve({
          ok: false,
          status: 429,
          headers: new Map(),
          json: async () => ({
            error: 'Too many requests',
            retryAfter: 5000
          })
        } as Response)
      })

      const response = await apiClient.get('/api/test', { retries: 0 })

      expect(response.success).toBe(false)
      expect(response.error).toBeDefined()
      expect(response.status).toBe(429)
    })
  })

  describe('Rate Limit State Management', () => {
    it('should track rate limit information from headers', async () => {
      global.fetch = vi.fn(() => {
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Map([
            ['x-ratelimit-remaining', '10'],
            ['x-ratelimit-limit', '100'],
            ['x-ratelimit-reset', '1234567890']
          ]),
          json: async () => ({ success: true, data: { id: '123' } })
        } as Response)
      })

      const response = await apiClient.get('/api/test')
      expect(response.success).toBe(true)

      const rateLimitInfo = apiClient.getRateLimitInfo('/api/test')
      expect(rateLimitInfo).not.toBeNull()
      expect(rateLimitInfo?.remaining).toBe(10)
      expect(rateLimitInfo?.limit).toBe(100)
    })

    it('should detect low rate limit availability', async () => {
      global.fetch = vi.fn(() => {
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Map([
            ['x-ratelimit-remaining', '5'],
            ['x-ratelimit-limit', '100'],
            ['x-ratelimit-reset', '1234567890']
          ]),
          json: async () => ({ success: true, data: { id: '123' } })
        } as Response)
      })

      const response = await apiClient.get('/api/test')
      expect(response.success).toBe(true)

      const isLow = apiClient.isApproachingRateLimit('/api/test')
      expect(isLow).toBe(true)
    })

    it('should not detect low rate limit when plenty remain', async () => {
      global.fetch = vi.fn(() => {
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Map([
            ['x-ratelimit-remaining', '99'],
            ['x-ratelimit-limit', '100'],
            ['x-ratelimit-reset', '1234567890']
          ]),
          json: async () => ({ success: true, data: { id: '123' } })
        } as Response)
      })

      const response = await apiClient.get('/api/test')
      expect(response.success).toBe(true)

      const isLow = apiClient.isApproachingRateLimit('/api/test')
      expect(isLow).toBe(false)
    })
  })

  describe('Error Messages and User Feedback', () => {
    it('should provide user-friendly error message for rate limit', async () => {
      global.fetch = vi.fn(() => {
        return Promise.resolve({
          ok: false,
          status: 429,
          headers: new Map(),
          json: async () => ({
            error: 'Too many requests',
            message: 'You are making requests too quickly. Please wait before trying again.'
          })
        } as Response)
      })

      const response = await apiClient.get('/api/test', { retries: 0 })

      expect(response.success).toBe(false)
      expect(response.status).toBe(429)
      expect(response.error).toContain('Too many requests')
    })

    it('should handle onRetry callback', async () => {
      let callCount = 0
      const onRetry = vi.fn()

      global.fetch = vi.fn(() => {
        callCount++
        if (callCount === 1) {
          return Promise.resolve({
            ok: false,
            status: 429,
            headers: new Map(),
            json: async () => ({ error: 'Rate limited' })
          } as Response)
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Map(),
          json: async () => ({ success: true })
        } as Response)
      })

      const response = await apiClient.get('/api/test', { retries: 1, onRetry })

      expect(response.success).toBe(true)
      expect(onRetry).toHaveBeenCalled()
    }, { timeout: 15000 })
  })

  describe('Other HTTP Status Codes', () => {
    it('should retry on 500 server errors', async () => {
      let callCount = 0
      global.fetch = vi.fn(() => {
        callCount++
        if (callCount === 1) {
          return Promise.resolve({
            ok: false,
            status: 500,
            headers: new Map(),
            json: async () => ({ error: 'Server error' })
          } as Response)
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Map(),
          json: async () => ({ success: true })
        } as Response)
      })

      const response = await apiClient.get('/api/test', { retries: 1 })

      expect(response.success).toBe(true)
      expect(callCount).toBeGreaterThan(1)
    }, { timeout: 15000 })

    it('should not retry on 400 Bad Request', async () => {
      global.fetch = vi.fn(() => {
        return Promise.resolve({
          ok: false,
          status: 400,
          headers: new Map(),
          json: async () => ({ error: 'Bad request' })
        } as Response)
      })

      const response = await apiClient.get('/api/test', { retries: 2 })

      expect(response.success).toBe(false)
      expect(global.fetch).toHaveBeenCalledTimes(1) // No retries for 400
    })

    it('should not retry on 404 Not Found', async () => {
      global.fetch = vi.fn(() => {
        return Promise.resolve({
          ok: false,
          status: 404,
          headers: new Map(),
          json: async () => ({ error: 'Not found' })
        } as Response)
      })

      const response = await apiClient.get('/api/test', { retries: 2 })

      expect(response.success).toBe(false)
      expect(global.fetch).toHaveBeenCalledTimes(1) // No retries for 404
    })
  })

  describe('Network Error Handling', () => {
    it('should handle network errors', async () => {
      global.fetch = vi.fn(() => {
        return Promise.reject(new Error('Network error'))
      })

      const response = await apiClient.get('/api/test', { retries: 1 })

      expect(response.success).toBe(false)
      expect(response.error).toBeDefined()
    }, { timeout: 15000 })

    it('should handle abort errors separately from network errors', async () => {
      const abortError = new Error('AbortError')
      abortError.name = 'AbortError'

      global.fetch = vi.fn(() => {
        return Promise.reject(abortError)
      })

      const response = await apiClient.get('/api/test', { timeout: 100 })

      expect(response.success).toBe(false)
      expect(response.error).toContain('timeout')
      // Should not retry on timeout
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('Cache Behavior During Rate Limiting', () => {
    it('should not cache 429 responses', async () => {
      global.fetch = vi.fn(() => {
        return Promise.resolve({
          ok: false,
          status: 429,
          headers: new Map(),
          json: async () => ({ error: 'Rate limited' })
        } as Response)
      })

      const response = await apiClient.get('/api/test', { cache: true })

      // Should not be successful, so cache should not be set
      expect(response.success).toBe(false)
    })

    it('should cache successful responses', async () => {
      let callCount = 0
      global.fetch = vi.fn(() => {
        callCount++
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Map(),
          json: async () => ({ success: true, data: { id: '123' } })
        } as Response)
      })

      const response1 = await apiClient.get('/api/test', { cache: true, cacheTTL: 5000 })

      // Second call should use cache
      const response2 = await apiClient.get('/api/test', { cache: true })

      expect(response1.success).toBe(true)
      expect(response2.success).toBe(true)
      // Should only call fetch once (second call uses cache)
      expect(callCount).toBe(1)
    })
  })

  describe('POST/PUT/PATCH/DELETE Methods', () => {
    it('should handle POST with 429 retry', async () => {
      let callCount = 0
      global.fetch = vi.fn(() => {
        callCount++
        if (callCount === 1) {
          return Promise.resolve({
            ok: false,
            status: 429,
            headers: new Map(),
            json: async () => ({ error: 'Rate limited' })
          } as Response)
        }
        return Promise.resolve({
          ok: true,
          status: 201,
          headers: new Map(),
          json: async () => ({ success: true, id: '123' })
        } as Response)
      })

      const response = await apiClient.post('/api/test', { name: 'test' }, { retries: 1 })

      expect(response.success).toBe(true)
      expect(callCount).toBeGreaterThan(1)
    }, { timeout: 15000 })

    it('should handle PATCH with 429 retry', async () => {
      let callCount = 0
      global.fetch = vi.fn(() => {
        callCount++
        if (callCount === 1) {
          return Promise.resolve({
            ok: false,
            status: 429,
            headers: new Map(),
            json: async () => ({ error: 'Rate limited' })
          } as Response)
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Map(),
          json: async () => ({ success: true })
        } as Response)
      })

      const response = await apiClient.patch('/api/test/123', { name: 'updated' }, { retries: 1 })

      expect(response.success).toBe(true)
      expect(callCount).toBeGreaterThan(1)
    }, { timeout: 15000 })

    it('should handle DELETE with 429 retry', async () => {
      let callCount = 0
      global.fetch = vi.fn(() => {
        callCount++
        if (callCount === 1) {
          return Promise.resolve({
            ok: false,
            status: 429,
            headers: new Map(),
            json: async () => ({ error: 'Rate limited' })
          } as Response)
        }
        return Promise.resolve({
          ok: true,
          status: 204,
          headers: new Map(),
          json: async () => ({})
        } as Response)
      })

      const response = await apiClient.delete('/api/test/123', { retries: 1 })

      expect(response.success).toBe(true)
      expect(callCount).toBeGreaterThan(1)
    }, { timeout: 15000 })
  })
})
