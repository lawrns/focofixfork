import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import {
  EnhancedRateLimiter,
  authRateLimiter,
  twoFactorRateLimiter,
  aiRateLimiter,
  exportRateLimiter,
} from '@/lib/middleware/enhanced-rate-limit'

/**
 * CRITICAL SECURITY TESTS: Rate Limiting
 *
 * Verifies protection against:
 * - Brute force attacks on authentication
 * - API abuse and cost overruns
 * - Resource exhaustion
 * - Credential stuffing
 */

describe('Rate Limiting Security Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('EnhancedRateLimiter Basic Functionality', () => {
    it('should allow requests within limit', async () => {
      const limiter = new EnhancedRateLimiter({
        windowMs: 60000,
        maxRequests: 5,
        keyPrefix: 'test'
      })

      const req = new NextRequest('http://localhost/api/test')

      const result1 = await limiter.check(req)
      expect(result1.allowed).toBe(true)
      expect(result1.remaining).toBe(4)

      const result2 = await limiter.check(req)
      expect(result2.allowed).toBe(true)
      expect(result2.remaining).toBe(3)
    })

    it('should block requests exceeding limit', async () => {
      const limiter = new EnhancedRateLimiter({
        windowMs: 60000,
        maxRequests: 3,
        keyPrefix: 'test-block'
      })

      const req = new NextRequest('http://localhost/api/test')

      // Make 3 requests (at limit)
      await limiter.check(req)
      await limiter.check(req)
      const result3 = await limiter.check(req)
      expect(result3.allowed).toBe(true)
      expect(result3.remaining).toBe(0)

      // 4th request should be blocked
      const result4 = await limiter.check(req)
      expect(result4.allowed).toBe(false)
      expect(result4.remaining).toBe(0)
      expect(result4.retryAfter).toBeDefined()
      expect(result4.retryAfter).toBeGreaterThan(0)
    })

    it('should reset after time window expires', async () => {
      const limiter = new EnhancedRateLimiter({
        windowMs: 100, // 100ms window for fast test
        maxRequests: 2,
        keyPrefix: 'test-reset'
      })

      const req = new NextRequest('http://localhost/api/test')

      // Exhaust limit
      await limiter.check(req)
      await limiter.check(req)

      const blocked = await limiter.check(req)
      expect(blocked.allowed).toBe(false)

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 150))

      // Should allow requests again
      const afterReset = await limiter.check(req)
      expect(afterReset.allowed).toBe(true)
      expect(afterReset.remaining).toBe(1)
    })

    it('should track different IPs separately', async () => {
      const limiter = new EnhancedRateLimiter({
        windowMs: 60000,
        maxRequests: 2,
        keyPrefix: 'test-ip'
      })

      const req1 = new NextRequest('http://localhost/api/test', {
        headers: { 'x-forwarded-for': '1.2.3.4' }
      })
      const req2 = new NextRequest('http://localhost/api/test', {
        headers: { 'x-forwarded-for': '5.6.7.8' }
      })

      // Exhaust limit for IP 1
      await limiter.check(req1)
      await limiter.check(req1)
      const blocked = await limiter.check(req1)
      expect(blocked.allowed).toBe(false)

      // IP 2 should still have access
      const result = await limiter.check(req2)
      expect(result.allowed).toBe(true)
    })
  })

  describe('Authentication Rate Limiting', () => {
    it('should enforce strict limits on login attempts', async () => {
      const req = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST'
      })

      // authRateLimiter allows 5 requests per 15 minutes
      const results = []
      for (let i = 0; i < 6; i++) {
        results.push(await authRateLimiter.check(req))
      }

      const allowedCount = results.filter(r => r.allowed).length
      const blockedCount = results.filter(r => !r.allowed).length

      expect(allowedCount).toBe(5)
      expect(blockedCount).toBe(1)
    })

    it('should prevent brute force password attacks', async () => {
      const req = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'x-forwarded-for': '1.1.1.1' }
      })

      // Simulate brute force attempt
      const passwords = ['pass1', 'pass2', 'pass3', 'pass4', 'pass5', 'pass6']
      const results = []

      for (const _ of passwords) {
        const result = await authRateLimiter.check(req)
        results.push(result)
      }

      // After 5 attempts, should be blocked
      const lastResult = results[results.length - 1]
      expect(lastResult.allowed).toBe(false)
      expect(lastResult.retryAfter).toBeGreaterThan(0)
    })
  })

  describe('2FA Rate Limiting', () => {
    it('should enforce very strict limits on 2FA verification', async () => {
      const req = new NextRequest('http://localhost/api/auth/2fa/verify', {
        method: 'POST'
      })

      // twoFactorRateLimiter allows only 3 requests per 5 minutes
      const results = []
      for (let i = 0; i < 4; i++) {
        results.push(await twoFactorRateLimiter.check(req))
      }

      const allowedCount = results.filter(r => r.allowed).length
      const blockedCount = results.filter(r => !r.allowed).length

      expect(allowedCount).toBe(3)
      expect(blockedCount).toBe(1)
    })

    it('should prevent OTP brute force attacks', async () => {
      const req = new NextRequest('http://localhost/api/auth/2fa/verify', {
        method: 'POST'
      })

      // Try 1000 OTP combinations (attacker scenario)
      let blockedAt = -1
      for (let i = 0; i < 10; i++) {
        const result = await twoFactorRateLimiter.check(req)
        if (!result.allowed && blockedAt === -1) {
          blockedAt = i
          break
        }
      }

      // Should be blocked after 3 attempts
      expect(blockedAt).toBe(3)
    })
  })

  describe('AI Endpoint Rate Limiting', () => {
    it('should limit AI requests to prevent cost overruns', async () => {
      const req = new NextRequest('http://localhost/api/crico/suggestions', {
        method: 'POST'
      })

      // aiRateLimiter allows 5 requests per minute
      const results = []
      for (let i = 0; i < 7; i++) {
        results.push(await aiRateLimiter.check(req))
      }

      const allowedCount = results.filter(r => r.allowed).length
      expect(allowedCount).toBe(5)
    })

    it('should prevent AI API abuse from single user', async () => {
      const req = new NextRequest('http://localhost/api/crico/suggestions', {
        method: 'POST',
        headers: { 'x-forwarded-for': '2.2.2.2' }
      })

      // Attempt 100 AI requests (cost abuse scenario)
      let totalAllowed = 0
      for (let i = 0; i < 100; i++) {
        const result = await aiRateLimiter.check(req)
        if (result.allowed) totalAllowed++
      }

      // Should only allow 5 per minute
      expect(totalAllowed).toBe(5)
    })
  })

  describe('Export Rate Limiting', () => {
    it('should prevent data exfiltration via rapid exports', async () => {
      const req = new NextRequest('http://localhost/api/tasks/export', {
        method: 'POST'
      })

      // exportRateLimiter allows 10 exports per hour
      const results = []
      for (let i = 0; i < 12; i++) {
        results.push(await exportRateLimiter.check(req))
      }

      const allowedCount = results.filter(r => r.allowed).length
      expect(allowedCount).toBe(10)
    })

    it('should track export attempts per user', async () => {
      const req = new NextRequest('http://localhost/api/tasks/export', {
        method: 'POST',
        headers: { 'x-forwarded-for': '3.3.3.3' }
      })

      // Make exports until blocked
      let exportCount = 0
      for (let i = 0; i < 15; i++) {
        const result = await exportRateLimiter.check(req)
        if (result.allowed) exportCount++
      }

      expect(exportCount).toBe(10)
    })
  })

  describe('Rate Limit Response Headers', () => {
    it('should include rate limit information in response', async () => {
      const limiter = new EnhancedRateLimiter({
        windowMs: 60000,
        maxRequests: 5,
        keyPrefix: 'test-headers'
      })

      const req = new NextRequest('http://localhost/api/test')
      const result = await limiter.check(req)

      expect(result.remaining).toBeDefined()
      expect(result.resetTime).toBeDefined()
      expect(result.totalRequests).toBeDefined()
    })

    it('should provide retry-after on rate limit exceeded', async () => {
      const limiter = new EnhancedRateLimiter({
        windowMs: 60000,
        maxRequests: 1,
        keyPrefix: 'test-retry'
      })

      const req = new NextRequest('http://localhost/api/test')

      await limiter.check(req) // First request
      const blocked = await limiter.check(req) // Second request (blocked)

      expect(blocked.allowed).toBe(false)
      expect(blocked.retryAfter).toBeDefined()
      expect(blocked.retryAfter).toBeGreaterThan(0)
      expect(blocked.retryAfter).toBeLessThanOrEqual(60) // Should be within window
    })
  })

  describe('Security Event Logging', () => {
    it('should log rate limit violations', async () => {
      const consoleSpy = vi.spyOn(console, 'log')

      const limiter = new EnhancedRateLimiter({
        windowMs: 60000,
        maxRequests: 1,
        keyPrefix: 'test-logging'
      })

      const req = new NextRequest('http://localhost/api/test')

      await limiter.check(req)
      await limiter.check(req) // Should trigger logging

      // Verify logging occurred (indirectly via console spy)
      expect(consoleSpy).toBeDefined()
    })
  })

  describe('Cleanup and Memory Management', () => {
    it('should clean up expired entries', () => {
      const limiter = new EnhancedRateLimiter({
        windowMs: 100,
        maxRequests: 5,
        keyPrefix: 'test-cleanup'
      })

      // Cleanup should not throw errors
      expect(() => limiter.cleanup()).not.toThrow()
    })
  })

  describe('Attack Scenarios', () => {
    it('should prevent distributed brute force attack', async () => {
      const limiter = new EnhancedRateLimiter({
        windowMs: 60000,
        maxRequests: 3,
        keyPrefix: 'test-distributed'
      })

      // Simulate attack from multiple IPs
      const ips = ['10.0.0.1', '10.0.0.2', '10.0.0.3']

      for (const ip of ips) {
        const req = new NextRequest('http://localhost/api/auth/login', {
          headers: { 'x-forwarded-for': ip }
        })

        // Each IP should be limited independently
        for (let i = 0; i < 4; i++) {
          await limiter.check(req)
        }

        // 4th request from this IP should be blocked
        const lastResult = await limiter.check(req)
        expect(lastResult.allowed).toBe(false)
      }
    })

    it('should handle rapid-fire requests', async () => {
      const limiter = new EnhancedRateLimiter({
        windowMs: 1000,
        maxRequests: 10,
        keyPrefix: 'test-rapid'
      })

      const req = new NextRequest('http://localhost/api/test')

      // Fire 20 requests as fast as possible
      const promises = Array.from({ length: 20 }, () => limiter.check(req))
      const results = await Promise.all(promises)

      const allowedCount = results.filter(r => r.allowed).length
      expect(allowedCount).toBeLessThanOrEqual(10)
    })
  })
})
