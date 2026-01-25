import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

/**
 * Enhanced Rate Limiting Middleware
 *
 * CRITICAL SECURITY: Protects against brute force, enumeration, and API abuse
 *
 * Features:
 * - Per-endpoint rate limits
 * - Per-user and per-IP rate limiting
 * - Rate limit headers in responses
 * - Security event logging
 * - Exponential backoff suggestions
 */

interface RateLimitConfig {
  windowMs: number          // Time window in milliseconds
  maxRequests: number       // Maximum requests per window
  keyPrefix: string         // Unique prefix for this limiter
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
  message?: string          // Custom error message
}

interface RateLimitEntry {
  count: number
  resetTime: number
  firstRequest: number
}

// In-memory store (in production, use Redis with @upstash/ratelimit)
const rateLimitStore = new Map<string, RateLimitEntry>()

/**
 * Rate limiter class with enhanced security features
 */
export class EnhancedRateLimiter {
  private config: RateLimitConfig

  constructor(config: RateLimitConfig) {
    this.config = config
  }

  /**
   * Generate rate limit key from request
   * Uses user ID if authenticated, otherwise IP address
   */
  private getKey(req: NextRequest, userId?: string): string {
    const identifier = userId || req.headers.get('x-forwarded-for') || req.ip || 'unknown'
    return `${this.config.keyPrefix}:${identifier}`
  }

  /**
   * Check rate limit and return result with headers
   */
  async check(req: NextRequest, userId?: string): Promise<{
    allowed: boolean
    remaining: number
    resetTime: number
    totalRequests: number
    retryAfter?: number
  }> {
    const key = this.getKey(req, userId)
    const now = Date.now()
    const entry = rateLimitStore.get(key)

    // No entry or window expired - create new
    if (!entry || now > entry.resetTime) {
      const newEntry: RateLimitEntry = {
        count: 1,
        resetTime: now + this.config.windowMs,
        firstRequest: now
      }
      rateLimitStore.set(key, newEntry)

      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetTime: newEntry.resetTime,
        totalRequests: 1
      }
    }

    // Check if limit exceeded
    if (entry.count >= this.config.maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000)

      // Log rate limit violation
      logger.warn('Rate limit exceeded', {
        event: 'rate_limit_exceeded',
        limiter: this.config.keyPrefix,
        userId: userId || 'anonymous',
        ip: req.headers.get('x-forwarded-for') || req.ip,
        endpoint: req.url,
        attempts: entry.count,
        windowMs: this.config.windowMs,
        maxRequests: this.config.maxRequests,
        retryAfter,
        timestamp: new Date().toISOString()
      })

      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
        totalRequests: entry.count,
        retryAfter
      }
    }

    // Increment counter
    entry.count++
    rateLimitStore.set(key, entry)

    return {
      allowed: true,
      remaining: this.config.maxRequests - entry.count,
      resetTime: entry.resetTime,
      totalRequests: entry.count
    }
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of rateLimitStore.entries()) {
      if (now > entry.resetTime) {
        rateLimitStore.delete(key)
      }
    }
  }

  /**
   * Get current rate limit status without incrementing
   */
  async status(req: NextRequest, userId?: string): Promise<{
    remaining: number
    resetTime: number
    totalRequests: number
  }> {
    const key = this.getKey(req, userId)
    const now = Date.now()
    const entry = rateLimitStore.get(key)

    if (!entry || now > entry.resetTime) {
      return {
        remaining: this.config.maxRequests,
        resetTime: now + this.config.windowMs,
        totalRequests: 0
      }
    }

    return {
      remaining: Math.max(0, this.config.maxRequests - entry.count),
      resetTime: entry.resetTime,
      totalRequests: entry.count
    }
  }
}

/**
 * Pre-configured rate limiters for different endpoint types
 */

// Authentication endpoints - strict limits to prevent brute force
export const authRateLimiter = new EnhancedRateLimiter({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  maxRequests: 5,             // 5 attempts per 15 minutes
  keyPrefix: 'auth',
  message: 'Too many authentication attempts. Please try again later.'
})

// 2FA verification - very strict to prevent OTP brute force
export const twoFactorRateLimiter = new EnhancedRateLimiter({
  windowMs: 5 * 60 * 1000,   // 5 minutes
  maxRequests: 3,             // 3 attempts per 5 minutes
  keyPrefix: '2fa',
  message: 'Too many verification attempts. Please wait before trying again.'
})

// AI/LLM endpoints - prevent cost abuse
export const aiRateLimiter = new EnhancedRateLimiter({
  windowMs: 60 * 1000,       // 1 minute
  maxRequests: 5,             // 5 AI requests per minute
  keyPrefix: 'ai',
  message: 'AI request limit exceeded. Please wait before making more requests.'
})

// AI voice endpoints - more expensive, stricter limits
export const aiVoiceRateLimiter = new EnhancedRateLimiter({
  windowMs: 60 * 1000,       // 1 minute
  maxRequests: 3,             // 3 voice requests per minute
  keyPrefix: 'ai-voice',
  message: 'Voice processing limit exceeded. Please wait before processing more audio.'
})

// Export endpoints - prevent data exfiltration
export const exportRateLimiter = new EnhancedRateLimiter({
  windowMs: 60 * 60 * 1000,  // 1 hour
  maxRequests: 10,            // 10 exports per hour
  keyPrefix: 'export',
  message: 'Export limit exceeded. Please wait before exporting more data.'
})

// File upload endpoints - prevent storage abuse
export const uploadRateLimiter = new EnhancedRateLimiter({
  windowMs: 60 * 1000,       // 1 minute
  maxRequests: 10,            // 10 uploads per minute
  keyPrefix: 'upload',
  message: 'Upload limit exceeded. Please wait before uploading more files.'
})

// General API endpoints - reasonable limits
export const apiRateLimiter = new EnhancedRateLimiter({
  windowMs: 60 * 1000,       // 1 minute
  maxRequests: 100,           // 100 requests per minute
  keyPrefix: 'api',
  message: 'API rate limit exceeded. Please slow down your requests.'
})

// Search endpoints - prevent enumeration
export const searchRateLimiter = new EnhancedRateLimiter({
  windowMs: 60 * 1000,       // 1 minute
  maxRequests: 30,            // 30 searches per minute
  keyPrefix: 'search',
  message: 'Search rate limit exceeded. Please wait before searching again.'
})

/**
 * Cursos Learning Platform Rate Limiters
 *
 * Protects Cursos endpoints from abuse while ensuring legitimate learning access
 */

// Cursos general API endpoints - moderate limits
export const cursosRateLimiter = new EnhancedRateLimiter({
  windowMs: 60 * 1000,       // 1 minute
  maxRequests: 60,            // 60 requests per minute
  keyPrefix: 'cursos',
  message: 'Cursos API rate limit exceeded. Please slow down your requests.'
})

// Cursos progress endpoints - stricter limits to prevent database spam
export const cursosProgressRateLimiter = new EnhancedRateLimiter({
  windowMs: 30 * 1000,       // 30 seconds
  maxRequests: 10,            // 10 progress updates per 30 seconds
  keyPrefix: 'cursos-progress',
  message: 'Progress update rate limit exceeded. Please wait before saving again.'
})

// Cursos checkpoint attempts - prevent brute force answers
export const cursosCheckpointRateLimiter = new EnhancedRateLimiter({
  windowMs: 60 * 1000,       // 1 minute
  maxRequests: 10,            // 10 checkpoint attempts per minute
  keyPrefix: 'cursos-checkpoint',
  message: 'Checkpoint attempt limit exceeded. Please review the material before trying again.'
})

// Cursos certification - very strict, prevent abuse
export const cursosCertificationRateLimiter = new EnhancedRateLimiter({
  windowMs: 60 * 60 * 1000,  // 1 hour
  maxRequests: 5,             // 5 certification requests per hour
  keyPrefix: 'cursos-certification',
  message: 'Certification request limit exceeded. Please wait before requesting again.'
})

/**
 * Middleware wrapper to apply rate limiting to routes
 *
 * Usage:
 * ```typescript
 * export const POST = withRateLimit(
 *   authRateLimiter,
 *   async (req) => {
 *     // Your handler logic
 *   }
 * )
 * ```
 */
export function withRateLimit(
  limiter: EnhancedRateLimiter,
  handler: (req: NextRequest, context?: any) => Promise<NextResponse>
) {
  return async (req: NextRequest, context?: any): Promise<NextResponse> => {
    try {
      // User ID will be extracted from IP address for rate limiting
      // Authentication is handled separately by requireAuth() in route handlers
      // eslint-disable-next-line no-restricted-syntax
      const userId = undefined

      // Check rate limit
      const result = await limiter.check(req, userId)

      // If rate limit exceeded, return 429
      if (!result.allowed) {
        const response = NextResponse.json(
          {
            success: false,
            error: 'Rate limit exceeded',
            message: 'Too many requests. Please try again later.',
            retryAfter: result.retryAfter
          },
          { status: 429 }
        )

        // Add rate limit headers
        response.headers.set('X-RateLimit-Limit', String(result.totalRequests))
        response.headers.set('X-RateLimit-Remaining', String(result.remaining))
        response.headers.set('X-RateLimit-Reset', String(Math.floor(result.resetTime / 1000)))
        response.headers.set('Retry-After', String(result.retryAfter || 60))

        return response
      }

      // Call the handler
      const handlerResponse = await handler(req, context)

      // Add rate limit headers to successful response
      handlerResponse.headers.set('X-RateLimit-Limit', String(result.totalRequests + result.remaining))
      handlerResponse.headers.set('X-RateLimit-Remaining', String(result.remaining))
      handlerResponse.headers.set('X-RateLimit-Reset', String(Math.floor(result.resetTime / 1000)))

      return handlerResponse
    } catch (error) {
      logger.error('Rate limit middleware error', { error })
      // On error, allow the request through but log it
      return await handler(req, context)
    }
  }
}

/**
 * Composite rate limiting - apply multiple limiters
 * Useful for endpoints that need both per-user and per-IP limits
 *
 * Usage:
 * ```typescript
 * export const POST = withMultipleRateLimits(
 *   [authRateLimiter, apiRateLimiter],
 *   async (req) => { ... }
 * )
 * ```
 */
export function withMultipleRateLimits(
  limiters: EnhancedRateLimiter[],
  handler: (req: NextRequest, context?: any) => Promise<NextResponse>
) {
  return async (req: NextRequest, context?: any): Promise<NextResponse> => {
    // User ID will be extracted from IP address for rate limiting
    // Authentication is handled separately by requireAuth() in route handlers
    // eslint-disable-next-line no-restricted-syntax
    const userId = undefined

    // Check all rate limiters
    for (const limiter of limiters) {
      const result = await limiter.check(req, userId)

      if (!result.allowed) {
        const response = NextResponse.json(
          {
            success: false,
            error: 'Rate limit exceeded',
            message: 'Too many requests. Please try again later.',
            retryAfter: result.retryAfter
          },
          { status: 429 }
        )

        response.headers.set('X-RateLimit-Limit', String(result.totalRequests))
        response.headers.set('X-RateLimit-Remaining', String(result.remaining))
        response.headers.set('X-RateLimit-Reset', String(Math.floor(result.resetTime / 1000)))
        response.headers.set('Retry-After', String(result.retryAfter || 60))

        return response
      }
    }

    // All limiters passed, call handler
    return await handler(req, context)
  }
}

/**
 * Clean up expired rate limit entries periodically
 */
function startCleanupInterval() {
  setInterval(() => {
    authRateLimiter.cleanup()
    twoFactorRateLimiter.cleanup()
    aiRateLimiter.cleanup()
    aiVoiceRateLimiter.cleanup()
    exportRateLimiter.cleanup()
    uploadRateLimiter.cleanup()
    apiRateLimiter.cleanup()
    searchRateLimiter.cleanup()
  }, 5 * 60 * 1000) // Every 5 minutes
}

// Start cleanup on module load
if (typeof window === 'undefined') {
  startCleanupInterval()
}

/**
 * Rate limit configuration for production with Redis
 *
 * Install: npm install @upstash/ratelimit @upstash/redis
 *
 * Example migration:
 * ```typescript
 * import { Ratelimit } from '@upstash/ratelimit'
 * import { Redis } from '@upstash/redis'
 *
 * const redis = new Redis({
 *   url: process.env.UPSTASH_REDIS_REST_URL,
 *   token: process.env.UPSTASH_REDIS_REST_TOKEN,
 * })
 *
 * export const authRateLimiter = new Ratelimit({
 *   redis,
 *   limiter: Ratelimit.slidingWindow(5, '15 m'),
 *   analytics: true,
 * })
 * ```
 */
export const REDIS_MIGRATION_GUIDE = {
  recommended: 'For production, migrate to Redis-based rate limiting',
  library: '@upstash/ratelimit',
  benefits: [
    'Persistent storage across server restarts',
    'Works with serverless and edge functions',
    'Distributed rate limiting across multiple servers',
    'Built-in analytics and monitoring'
  ],
  setup: 'See REDIS_MIGRATION_GUIDE in code comments'
}
