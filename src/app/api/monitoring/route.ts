import { NextRequest, NextResponse } from 'next/server'
import { rateLimiter, RATE_LIMITS, getClientIP } from '@/lib/rate-limiter'
import { monitoring } from '@/lib/monitoring'
import { userCache, projectCache, apiCache } from '@/lib/cache'

// CONSOLIDATE: Merge into /api/health?detailed=true
// This route is deprecated. Use GET /api/health with detailed query param.
// Migration: GET /api/health?detailed=true (for monitoring data)

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const ip = getClientIP(request)
    const { allowed, info } = rateLimiter.checkLimit(ip, RATE_LIMITS.GENERAL)

    if (!allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: `Too many requests. Try again in ${info.retryAfter} seconds.`,
          retryAfter: info.retryAfter
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': info.limit.toString(),
            'X-RateLimit-Remaining': info.remaining.toString(),
            'X-RateLimit-Reset': new Date(info.reset).toISOString(),
            'Retry-After': info.retryAfter?.toString() || '60'
          }
        }
      )
    }

    const body = await request.json()
    const { type, data } = body

    // Validate request
    if (!type || !data) {
      return NextResponse.json(
        { error: 'Missing type or data' },
        { status: 400 }
      )
    }

    // Process different types of monitoring data
    switch (type) {
      case 'metric':
        // Store metric data
        console.log('Metric received:', data)
        break

      case 'error':
        // Store error data
        console.error('Error received:', data)
        break

      case 'event':
        // Store event data
        console.log('Event received:', data)
        break

      case 'performance':
        // Store performance data
        console.log('Performance data received:', data)
        break

      default:
        return NextResponse.json(
          { error: 'Invalid type' },
          { status: 400 }
        )
    }

    return NextResponse.json({ success: true }, {
      headers: {
        'X-RateLimit-Limit': info.limit.toString(),
        'X-RateLimit-Remaining': info.remaining.toString(),
        'X-RateLimit-Reset': new Date(info.reset).toISOString()
      }
    })
  } catch (error) {
    console.error('Monitoring API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    const ip = getClientIP(request)
    const { allowed, info } = rateLimiter.checkLimit(ip, RATE_LIMITS.GENERAL)

    if (!allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: `Too many requests. Try again in ${info.retryAfter} seconds.`,
          retryAfter: info.retryAfter
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': info.limit.toString(),
            'X-RateLimit-Remaining': info.remaining.toString(),
            'X-RateLimit-Reset': new Date(info.reset).toISOString(),
            'Retry-After': info.retryAfter?.toString() || '60'
          }
        }
      )
    }

    const url = new URL(request.url)
    const timeRange = url.searchParams.get('timeRange')
    
    let startTime: number | undefined
    let endTime: number | undefined

    if (timeRange) {
      const now = Date.now()
      const rangeMs = parseInt(timeRange) * 60 * 1000 // Convert minutes to milliseconds
      startTime = now - rangeMs
      endTime = now
    }

    const range = timeRange ? { start: startTime!, end: endTime! } : undefined

    const analytics = monitoring.getAnalyticsSummary(range)
    const stats = {
      userCache: userCache.getStats(),
      projectCache: projectCache.getStats(),
      apiCache: apiCache.getStats()
    }

    return NextResponse.json({
      success: true,
      data: {
        analytics,
        cacheStats: stats
      }
    }, {
      headers: {
        'X-RateLimit-Limit': info.limit.toString(),
        'X-RateLimit-Remaining': info.remaining.toString(),
        'X-RateLimit-Reset': new Date(info.reset).toISOString()
      }
    })
  } catch (error) {
    console.error('Monitoring GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
