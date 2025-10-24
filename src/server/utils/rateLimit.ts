import { env } from '@/env'
import { logger } from '@/lib/logger'

export class RateLimitError extends Error {
  code = 'RATE_LIMITED'
  statusCode = 429
  retryAfter: number

  constructor(retryAfter: number) {
    super('Rate limit exceeded')
    this.name = 'RateLimitError'
    this.retryAfter = retryAfter
  }
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  limit: number
  reset: number
}

/**
 * Sliding window rate limiter using Upstash Redis
 *
 * @param key - Unique key for rate limiting (e.g., userId, IP address)
 * @param limit - Maximum number of requests allowed in the window
 * @param windowSeconds - Time window in seconds
 * @returns Rate limit result
 *
 * @example
 * const { allowed, remaining } = await rateLimit(`user:${userId}`, 100, 60)
 * if (!allowed) throw new RateLimitError(60)
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  // If Redis not configured, allow all requests
  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
    return {
      allowed: true,
      remaining: limit,
      limit,
      reset: Date.now() + windowSeconds * 1000
    }
  }

  try {
    const now = Math.floor(Date.now() / 1000)
    const bucket = `ratelimit:${key}:${Math.floor(now / windowSeconds)}`

    // Increment counter
    const incrRes = await fetch(`${env.UPSTASH_REDIS_REST_URL}/incr/${bucket}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.UPSTASH_REDIS_REST_TOKEN}`
      }
    })

    if (!incrRes.ok) {
      logger.error(JSON.stringify({ message: 'Rate limit increment failed', status: incrRes.status }))
      // On error, allow the request
      return {
        allowed: true,
        remaining: limit,
        limit,
        reset: Date.now() + windowSeconds * 1000
      }
    }

    const { result: count } = await incrRes.json()

    // Set expiry on first increment
    if (count === 1) {
      await fetch(`${env.UPSTASH_REDIS_REST_URL}/expire/${bucket}/${windowSeconds}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.UPSTASH_REDIS_REST_TOKEN}`
        }
      })
    }

    const allowed = count <= limit
    const remaining = Math.max(0, limit - count)
    const reset = (Math.floor(now / windowSeconds) + 1) * windowSeconds * 1000

    return {
      allowed,
      remaining,
      limit,
      reset
    }
  } catch (error) {
    logger.error(JSON.stringify({ message: 'Rate limit error', error: String(error) }))
    // On error, allow the request (fail open)
    return {
      allowed: true,
      remaining: limit,
      limit,
      reset: Date.now() + windowSeconds * 1000
    }
  }
}

/**
 * Rate limit middleware for API routes
 */
export async function checkRateLimit(
  userId: string | null,
  ip: string | null,
  type: 'api' | 'ai' | 'auth' = 'api'
): Promise<void> {
  const limits = {
    api: { limit: 100, window: 60 }, // 100 req/min
    ai: { limit: 10, window: 60 }, // 10 req/min
    auth: { limit: 5, window: 900 } // 5 req/15min
  }

  const config = limits[type]
  const key = userId ? `user:${userId}:${type}` : `ip:${ip}:${type}`

  const result = await rateLimit(key, config.limit, config.window)

  if (!result.allowed) {
    const retryAfter = Math.ceil((result.reset - Date.now()) / 1000)
    throw new RateLimitError(retryAfter)
  }
}
