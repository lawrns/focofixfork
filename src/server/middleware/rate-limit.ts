import { NextRequest, NextResponse } from 'next/server'

// Simple in-memory rate limiter (for production, use Redis or similar)
interface RateLimitEntry {
  count: number
  resetTime: number
  lockoutUntil?: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

// Configuration
const RATE_LIMIT_WINDOW = 15 * 60 * 1000 // 15 minutes
const MAX_REQUESTS_PER_WINDOW = 100 // 100 requests per 15 minutes
const AUTH_RATE_LIMIT_WINDOW = 15 * 60 * 1000 // 15 minutes for auth endpoints
const MAX_AUTH_ATTEMPTS = 5 // 5 failed login attempts
const LOCKOUT_DURATION = 15 * 60 * 1000 // 15 minutes lockout

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now && (!entry.lockoutUntil || entry.lockoutUntil < now)) {
      rateLimitStore.delete(key)
    }
  }
}, 60 * 1000) // Cleanup every minute

function getClientIdentifier(request: NextRequest): string {
  // Try to get IP from various headers (works with most reverse proxies)
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const cfConnectingIp = request.headers.get('cf-connecting-ip')

  const ip = forwarded?.split(',')[0] || realIp || cfConnectingIp || 'unknown'

  // For authenticated endpoints, use user email if available
  const url = new URL(request.url)
  const pathname = url.pathname

  return `${ip}:${pathname}`
}

export function checkRateLimit(
  request: NextRequest,
  options: {
    maxRequests?: number
    windowMs?: number
    isAuthEndpoint?: boolean
  } = {}
): { allowed: boolean; response?: NextResponse } {
  const clientId = getClientIdentifier(request)
  const now = Date.now()

  const maxRequests = options.maxRequests || MAX_REQUESTS_PER_WINDOW
  const windowMs = options.windowMs || RATE_LIMIT_WINDOW

  let entry = rateLimitStore.get(clientId)

  // Check if client is locked out
  if (entry?.lockoutUntil && entry.lockoutUntil > now) {
    const remainingLockout = Math.ceil((entry.lockoutUntil - now) / 1000)

    return {
      allowed: false,
      response: NextResponse.json(
        {
          success: false,
          error: {
            code: 'ACCOUNT_LOCKED',
            message: `Account temporarily locked due to too many failed attempts. Try again in ${remainingLockout} seconds.`,
          },
        },
        {
          status: 429,
          headers: {
            'Retry-After': remainingLockout.toString(),
            'X-RateLimit-Limit': maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': entry.lockoutUntil.toString(),
          },
        }
      ),
    }
  }

  // Initialize or reset if window expired
  if (!entry || entry.resetTime < now) {
    entry = {
      count: 1,
      resetTime: now + windowMs,
    }
    rateLimitStore.set(clientId, entry)

    return {
      allowed: true,
    }
  }

  // Increment count
  entry.count++

  // Check if limit exceeded
  if (entry.count > maxRequests) {
    const remainingTime = Math.ceil((entry.resetTime - now) / 1000)

    // For auth endpoints, lock the account after multiple violations
    if (options.isAuthEndpoint && entry.count > maxRequests + 2) {
      entry.lockoutUntil = now + LOCKOUT_DURATION
    }

    return {
      allowed: false,
      response: NextResponse.json(
        {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: `Too many requests. Please try again in ${remainingTime} seconds.`,
          },
        },
        {
          status: 429,
          headers: {
            'Retry-After': remainingTime.toString(),
            'X-RateLimit-Limit': maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': entry.resetTime.toString(),
          },
        }
      ),
    }
  }

  return {
    allowed: true,
  }
}

export function recordFailedAuthAttempt(request: NextRequest): void {
  const clientId = getClientIdentifier(request)
  const now = Date.now()

  let entry = rateLimitStore.get(clientId)

  if (!entry || entry.resetTime < now) {
    entry = {
      count: 1,
      resetTime: now + AUTH_RATE_LIMIT_WINDOW,
    }
  } else {
    entry.count++
  }

  // Lock account after max failed attempts
  if (entry.count >= MAX_AUTH_ATTEMPTS) {
    entry.lockoutUntil = now + LOCKOUT_DURATION
  }

  rateLimitStore.set(clientId, entry)
}

export function clearAuthAttempts(request: NextRequest): void {
  const clientId = getClientIdentifier(request)
  rateLimitStore.delete(clientId)
}

// Middleware wrapper for Next.js API routes
export function withRateLimit(
  handler: (req: NextRequest) => Promise<NextResponse>,
  options?: {
    maxRequests?: number
    windowMs?: number
    isAuthEndpoint?: boolean
  }
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const rateLimitCheck = checkRateLimit(req, options)

    if (!rateLimitCheck.allowed && rateLimitCheck.response) {
      return rateLimitCheck.response
    }

    return handler(req)
  }
}
