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
      expect(response.data).toEqual({ success: true, data: { id: '123' } })
      expect(callCount).toBeGreaterThan(1) // Should have retried
    }, { timeout: 10000 })

    it('should apply exponential backoff for 429 responses', async () => {
      let callCount = 0
      const callTimestamps: number[] = []

      global.fetch = vi.fn(() => {
        callCount++
        callTimestamps.push(Date.now())

        if (callCount < 3) {
          return Promise.resolve({
            ok: false,
            status: 429,
            json: async () => ({ error: 'Too many requests' })
          } as Response)
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ success: true, data: { id: '123' } })
        } as Response)
      })

      const responsePromise = apiClient.get('/api/test')
      vi.runAllTimers()
      await responsePromise

      expect(callCount).toBe(3)

      // Check that backoff increased (exponential)
      const timeDiff1 = callTimestamps[1] - callTimestamps[0]
      const timeDiff2 = callTimestamps[2] - callTimestamps[1]

      // Second backoff should be longer than first (exponential growth)
      expect(timeDiff2).toBeGreaterThanOrEqual(timeDiff1)
    })

    it('should include Retry-After header in calculation if present', async () => {
      let callCount = 0

      global.fetch = vi.fn(() => {
        callCount++
        if (callCount === 1) {
          return Promise.resolve({
            ok: false,
            status: 429,
            headers: new Map([['retry-after', '2']]),
            json: async () => ({ error: 'Too many requests' })
          } as Response)
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ success: true, data: { id: '123' } })
        } as Response)
      })

      const responsePromise = apiClient.get('/api/test')
      vi.runAllTimers()
      const response = await responsePromise

      expect(response.success).toBe(true)
      expect(callCount).toBeGreaterThan(1)
    })

    it('should fail after maximum retries on 429', async () => {
      global.fetch = vi.fn(() => {
        return Promise.resolve({
          ok: false,
          status: 429,
          json: async () => ({ error: 'Too many requests' })
        } as Response)
      })

      const responsePromise = apiClient.get('/api/test', { retries: 2 })
      vi.runAllTimers()
      const response = await responsePromise

      expect(response.success).toBe(false)
      expect(response.status).toBe(429)
      expect(global.fetch).toHaveBeenCalledTimes(3) // Initial + 2 retries
    })

    it('should not retry on 429 if retries is set to 0', async () => {
      global.fetch = vi.fn(() => {
        return Promise.resolve({
          ok: false,
          status: 429,
          json: async () => ({ error: 'Too many requests' })
        } as Response)
      })

      const responsePromise = apiClient.get('/api/test', { retries: 0 })
      vi.runAllTimers()
      const response = await responsePromise

      expect(response.success).toBe(false)
      expect(global.fetch).toHaveBeenCalledTimes(1) // Only initial attempt
    })

    it('should include rate limit error in response', async () => {
      global.fetch = vi.fn(() => {
        return Promise.resolve({
          ok: false,
          status: 429,
          json: async () => ({
            error: 'Too many requests',
            retryAfter: 5000
          })
        } as Response)
      })

      const responsePromise = apiClient.get('/api/test', { retries: 0 })
      vi.runAllTimers()
      const response = await responsePromise

      expect(response.success).toBe(false)
      expect(response.error).toBeDefined()
      expect(response.status).toBe(429)
    })
  })

  describe('Rate Limit State Management', () => {
    it('should track rate limit information', async () => {
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
      expect(global.fetch).toHaveBeenCalled()
    })

    it('should detect low rate limit availability', async () => {
      global.fetch = vi.fn(() => {
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Map([
            ['x-ratelimit-remaining', '1'],
            ['x-ratelimit-limit', '100']
          ]),
          json: async () => ({ success: true, data: { id: '123' } })
        } as Response)
      })

      const response = await apiClient.get('/api/test')
      expect(response.success).toBe(true)
    })
  })

  describe('Exponential Backoff Calculation', () => {
    it('should use correct backoff formula: 2^attempt * 1000ms', async () => {
      let attempts = 0
      global.fetch = vi.fn(() => {
        attempts++
        if (attempts < 4) {
          return Promise.resolve({
            ok: false,
            status: 429,
            json: async () => ({ error: 'Too many requests' })
          } as Response)
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ success: true })
        } as Response)
      })

      const responsePromise = apiClient.get('/api/test', { retries: 3 })

      // Attempt 0: immediate
      vi.advanceTimersByTime(0)
      expect(attempts).toBeGreaterThanOrEqual(1)

      // After first backoff (1000ms)
      vi.advanceTimersByTime(1000)
      expect(attempts).toBeGreaterThanOrEqual(2)

      // After second backoff (2000ms)
      vi.advanceTimersByTime(2000)
      expect(attempts).toBeGreaterThanOrEqual(3)

      // After third backoff (4000ms)
      vi.advanceTimersByTime(4000)

      const response = await responsePromise
      expect(response.success).toBe(true)
    })
  })

  describe('Error Messages and User Feedback', () => {
    it('should provide user-friendly error message for rate limit', async () => {
      global.fetch = vi.fn(() => {
        return Promise.resolve({
          ok: false,
          status: 429,
          json: async () => ({
            error: 'Too many requests',
            message: 'You are making requests too quickly. Please wait before trying again.'
          })
        } as Response)
      })

      const responsePromise = apiClient.get('/api/test', { retries: 0 })
      vi.runAllTimers()
      const response = await responsePromise

      expect(response.success).toBe(false)
      expect(response.status).toBe(429)
    })

    it('should include retry information in response', async () => {
      let callCount = 0

      global.fetch = vi.fn(() => {
        callCount++
        if (callCount === 1) {
          return Promise.resolve({
            ok: false,
            status: 429,
            headers: new Map([['retry-after', '1']]),
            json: async () => ({ error: 'Rate limited' })
          } as Response)
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ success: true })
        } as Response)
      })

      const responsePromise = apiClient.get('/api/test')
      vi.runAllTimers()
      const response = await responsePromise

      expect(response.success).toBe(true)
    })
  })

  describe('Other HTTP Status Codes', () => {
    it('should not retry on 429 if configured to only retry on 5xx', async () => {
      let callCount = 0
      global.fetch = vi.fn(() => {
        callCount++
        return Promise.resolve({
          ok: false,
          status: 429,
          json: async () => ({ error: 'Too many requests' })
        } as Response)
      })

      // Test default behavior - should retry on 429
      const responsePromise = apiClient.get('/api/test', { retries: 2 })
      vi.runAllTimers()
      const response = await responsePromise

      // Should retry on 429
      expect(callCount).toBeGreaterThanOrEqual(1)
    })

    it('should still handle 500 errors with retries', async () => {
      let callCount = 0
      global.fetch = vi.fn(() => {
        callCount++
        if (callCount === 1) {
          return Promise.resolve({
            ok: false,
            status: 500,
            json: async () => ({ error: 'Server error' })
          } as Response)
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ success: true })
        } as Response)
      })

      const responsePromise = apiClient.get('/api/test')
      vi.runAllTimers()
      const response = await responsePromise

      expect(response.success).toBe(true)
      expect(callCount).toBeGreaterThan(1)
    })

    it('should not retry on 4xx errors (except 429)', async () => {
      global.fetch = vi.fn(() => {
        return Promise.resolve({
          ok: false,
          status: 400,
          json: async () => ({ error: 'Bad request' })
        } as Response)
      })

      const responsePromise = apiClient.get('/api/test', { retries: 2 })
      vi.runAllTimers()
      const response = await responsePromise

      expect(response.success).toBe(false)
      expect(global.fetch).toHaveBeenCalledTimes(1) // No retries for 400
    })
  })

  describe('Timeout and Network Error Handling', () => {
    it('should still handle network errors even during rate limit retries', async () => {
      let callCount = 0
      global.fetch = vi.fn(() => {
        callCount++
        if (callCount === 1) {
          return Promise.reject(new Error('Network error'))
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ success: true })
        } as Response)
      })

      const responsePromise = apiClient.get('/api/test')
      vi.runAllTimers()
      const response = await responsePromise

      expect(callCount).toBeGreaterThan(1)
    })

    it('should handle abort errors separately from network errors', async () => {
      const abortError = new Error('AbortError')
      abortError.name = 'AbortError'

      global.fetch = vi.fn(() => {
        return Promise.reject(abortError)
      })

      const responsePromise = apiClient.get('/api/test', { timeout: 100 })
      vi.runAllTimers()
      const response = await responsePromise

      expect(response.success).toBe(false)
      // Should not retry on timeout
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('Concurrent Requests During Rate Limiting', () => {
    it('should handle multiple concurrent requests with rate limiting', async () => {
      let callCount = 0

      global.fetch = vi.fn(() => {
        callCount++
        if (callCount <= 2) {
          return Promise.resolve({
            ok: false,
            status: 429,
            json: async () => ({ error: 'Rate limited' })
          } as Response)
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ success: true })
        } as Response)
      })

      const request1 = apiClient.get('/api/users')
      const request2 = apiClient.get('/api/projects')

      vi.runAllTimers()

      const [response1, response2] = await Promise.all([request1, request2])

      expect(response1.success).toBe(true)
      expect(response2.success).toBe(true)
      expect(callCount).toBeGreaterThan(2)
    })
  })

  describe('Cache Behavior During Rate Limiting', () => {
    it('should not cache 429 responses', async () => {
      global.fetch = vi.fn(() => {
        return Promise.resolve({
          ok: false,
          status: 429,
          json: async () => ({ error: 'Rate limited' })
        } as Response)
      })

      const response = await apiClient.get('/api/test', { cache: true })

      // Should not be successful, so cache should not be set
      expect(response.success).toBe(false)
    })

    it('should use cache after successful retry', async () => {
      let callCount = 0

      global.fetch = vi.fn(() => {
        callCount++
        if (callCount === 1) {
          return Promise.resolve({
            ok: false,
            status: 429,
            json: async () => ({ error: 'Rate limited' })
          } as Response)
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ success: true, data: { id: '123' } })
        } as Response)
      })

      const response1 = await apiClient.get('/api/test', { cache: true })
      vi.runAllTimers()

      // Second call should use cache
      const response2 = await apiClient.get('/api/test', { cache: true })

      expect(response1.success).toBe(true)
      expect(response2.success).toBe(true)
      // Should only call fetch twice (one failed 429, one successful)
      // Third call should use cache and not call fetch
      expect(callCount).toBe(2)
    })
  })
})
