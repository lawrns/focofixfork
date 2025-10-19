/**
 * Rate Limiter for API endpoints
 * Provides protection against abuse and ensures fair usage
 */

interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Maximum requests per window
  skipSuccessfulRequests?: boolean // Don't count successful requests
  skipFailedRequests?: boolean // Don't count failed requests
  keyGenerator?: (req: any) => string // Custom key generator
}

interface RateLimitInfo {
  limit: number
  remaining: number
  reset: number
  retryAfter?: number
}

class RateLimiter {
  private store = new Map<string, { count: number; resetTime: number }>()
  private readonly CLEANUP_INTERVAL = 60 * 1000 // 1 minute

  constructor() {
    // Cleanup expired entries periodically
    setInterval(() => this.cleanup(), this.CLEANUP_INTERVAL)
  }

  /**
   * Check if request is within rate limit
   */
  checkLimit(
    key: string,
    config: RateLimitConfig
  ): { allowed: boolean; info: RateLimitInfo } {
    const now = Date.now()
    const windowStart = now - config.windowMs

    // Get or create entry
    let entry = this.store.get(key)
    
    if (!entry || entry.resetTime < now) {
      // Create new window
      entry = {
        count: 0,
        resetTime: now + config.windowMs
      }
      this.store.set(key, entry)
    }

    // Check if limit exceeded
    if (entry.count >= config.maxRequests) {
      return {
        allowed: false,
        info: {
          limit: config.maxRequests,
          remaining: 0,
          reset: entry.resetTime,
          retryAfter: Math.ceil((entry.resetTime - now) / 1000)
        }
      }
    }

    // Increment counter
    entry.count++

    return {
      allowed: true,
      info: {
        limit: config.maxRequests,
        remaining: config.maxRequests - entry.count,
        reset: entry.resetTime
      }
    }
  }

  /**
   * Record a request (for tracking purposes)
   */
  recordRequest(key: string, config: RateLimitConfig, success: boolean = true): void {
    if (config.skipSuccessfulRequests && success) return
    if (config.skipFailedRequests && !success) return

    this.checkLimit(key, config)
  }

  /**
   * Get current rate limit info without incrementing
   */
  getInfo(key: string, config: RateLimitConfig): RateLimitInfo | null {
    const entry = this.store.get(key)
    if (!entry) return null

    const now = Date.now()
    if (entry.resetTime < now) return null

    return {
      limit: config.maxRequests,
      remaining: Math.max(0, config.maxRequests - entry.count),
      reset: entry.resetTime
    }
  }

  /**
   * Reset rate limit for a key
   */
  reset(key: string): void {
    this.store.delete(key)
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.store.entries()) {
      if (entry.resetTime < now) {
        this.store.delete(key)
      }
    }
  }

  /**
   * Get all active rate limits
   */
  getAllActive(): Array<{ key: string; count: number; resetTime: number }> {
    const now = Date.now()
    const active: Array<{ key: string; count: number; resetTime: number }> = []

    for (const [key, entry] of this.store.entries()) {
      if (entry.resetTime >= now) {
        active.push({
          key,
          count: entry.count,
          resetTime: entry.resetTime
        })
      }
    }

    return active
  }
}

// Predefined rate limit configurations
export const RATE_LIMITS = {
  // General API limits
  GENERAL: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 1000
  },

  // Authentication endpoints
  AUTH: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10
  },

  // AI endpoints (more restrictive)
  AI: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10
  },

  // File upload endpoints
  UPLOAD: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5
  },

  // Search endpoints
  SEARCH: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60
  },

  // Export endpoints
  EXPORT: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 3
  }
} as const

// Create rate limiter instance
export const rateLimiter = new RateLimiter()

// Helper function to create rate limit middleware
export function createRateLimitMiddleware(config: RateLimitConfig) {
  return (req: any, res: any, next: any) => {
    const key = config.keyGenerator 
      ? config.keyGenerator(req) 
      : req.ip || req.connection.remoteAddress || 'unknown'

    const { allowed, info } = rateLimiter.checkLimit(key, config)

    // Set rate limit headers
    res.set({
      'X-RateLimit-Limit': info.limit.toString(),
      'X-RateLimit-Remaining': info.remaining.toString(),
      'X-RateLimit-Reset': new Date(info.reset).toISOString()
    })

    if (!allowed) {
      res.set('Retry-After', info.retryAfter?.toString() || '60')
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: `Too many requests. Try again in ${info.retryAfter} seconds.`,
        retryAfter: info.retryAfter
      })
    }

    next()
  }
}

// Helper function for Next.js API routes
export function withRateLimit(
  handler: any,
  config: RateLimitConfig
) {
  return async (req: any, res: any) => {
    const key = config.keyGenerator 
      ? config.keyGenerator(req) 
      : req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown'

    const { allowed, info } = rateLimiter.checkLimit(key, config)

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', info.limit.toString())
    res.setHeader('X-RateLimit-Remaining', info.remaining.toString())
    res.setHeader('X-RateLimit-Reset', new Date(info.reset).toISOString())

    if (!allowed) {
      res.setHeader('Retry-After', info.retryAfter?.toString() || '60')
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: `Too many requests. Try again in ${info.retryAfter} seconds.`,
        retryAfter: info.retryAfter
      })
    }

    try {
      await handler(req, res)
    } catch (error) {
      // Record failed request
      rateLimiter.recordRequest(key, config, false)
      throw error
    }

    // Record successful request
    rateLimiter.recordRequest(key, config, true)
  }
}

// Utility function to get client IP
export function getClientIP(req: any): string {
  return (
    req.headers['x-forwarded-for']?.split(',')[0] ||
    req.headers['x-real-ip'] ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    'unknown'
  )
}

// Utility function to create user-specific rate limit key
export function createUserRateLimitKey(req: any): string {
  // Only use authenticated user ID from session, not headers
  const userId = req.user?.id
  const ip = getClientIP(req)
  
  if (userId) {
    return `user:${userId}`
  }
  
  return `ip:${ip}`
}

