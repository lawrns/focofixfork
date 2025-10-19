import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { databaseOptimizer } from '@/lib/database/optimizer'
import { monitoring } from '@/lib/monitoring'
import { userCache, projectCache, apiCache } from '@/lib/cache'

export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now()
    
    // Check database connectivity
    const { data: dbTest, error: dbError } = await supabaseAdmin
      .from('organizations')
      .select('count')
      .limit(1)

    if (dbError) {
      throw new Error(`Database error: ${dbError.message}`)
    }

    // Get database statistics
    const dbStats = await databaseOptimizer.getDatabaseStats()
    
    // Get monitoring statistics
    const monitoringStats = monitoring.getAnalyticsSummary()
    
    // Get cache statistics
    const cacheStats = {
      userCache: userCache.getStats(),
      projectCache: projectCache.getStats(),
      apiCache: apiCache.getStats()
    }

    const responseTime = Date.now() - startTime

    // Record health check metric
    monitoring.recordMetric('health-check-response-time', responseTime)

    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      responseTime,
      database: {
        connected: true,
        stats: dbStats
      },
      monitoring: monitoringStats,
      cache: cacheStats,
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
      }
    }

    return NextResponse.json(health)
  } catch (error) {
    console.error('Health check failed:', error)
    
    // Record health check error
    monitoring.recordError(error as Error, 'high', {
      endpoint: 'health-check'
    })

    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        environment: {
          nodeEnv: process.env.NODE_ENV,
          hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
        }
      },
      { status: 500 }
    )
  }
}