/**
 * Health Check API Route
 *
 * Provides health status information for monitoring and load balancers.
 * This endpoint checks database connectivity and system status.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    // Check database connectivity
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: { autoRefreshToken: false, persistSession: false }
      }
    )

    // Simple health check query
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1)
      .single()

    const dbHealthy = !error
    const responseTime = Date.now() - startTime

    // Check environment variables
    const requiredEnvVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY'
    ]

    const missingEnvVars = requiredEnvVars.filter(
      envVar => !process.env[envVar]
    )

    const envHealthy = missingEnvVars.length === 0

    // Determine overall health
    const overallHealthy = dbHealthy && envHealthy && responseTime < 5000

    const healthStatus = {
      status: overallHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      response_time_ms: responseTime,
      checks: {
        database: {
          status: dbHealthy ? 'healthy' : 'unhealthy',
          response_time_ms: responseTime,
          details: dbHealthy ? 'Connected' : error?.message || 'Connection failed'
        },
        environment: {
          status: envHealthy ? 'healthy' : 'unhealthy',
          details: envHealthy ? 'All required variables present' : `Missing: ${missingEnvVars.join(', ')}`
        }
      },
      environment: {
        node_version: process.version,
        platform: process.platform,
        arch: process.arch,
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          external: Math.round(process.memoryUsage().external / 1024 / 1024)
        }
      }
    }

    // Return appropriate HTTP status
    const statusCode = overallHealthy ? 200 : 503 // Service Unavailable

    return NextResponse.json(healthStatus, {
      status: statusCode,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json'
      }
    })

  } catch (error) {
    const responseTime = Date.now() - startTime

    const errorHealthStatus = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      response_time_ms: responseTime,
      error: error instanceof Error ? error.message : 'Unknown error',
      checks: {
        general: {
          status: 'unhealthy',
          details: 'Unexpected error occurred'
        }
      }
    }

    return NextResponse.json(errorHealthStatus, {
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json'
      }
    })
  }
}

// Also support HEAD requests for load balancers
export async function HEAD(request: NextRequest) {
  const response = await GET(request)
  return new Response(null, {
    status: response.status,
    headers: response.headers
  })
}


