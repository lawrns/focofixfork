import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/api/auth-helper'

import { getCacheStats } from '@/lib/cache/redis'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { user, error } = await getAuthUser(req)

    if (error || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const cacheStats = await getCacheStats()

    const metrics = {
      cache: {
        hits: cacheStats.hits,
        misses: cacheStats.misses,
        hitRate: cacheStats.hitRate.toFixed(2) + '%',
        status: cacheStats.hitRate > 80 ? '✅ Excellent' : cacheStats.hitRate > 60 ? '⚠️ Good' : '🔴 Needs Improvement',
      },
      timestamp: new Date().toISOString(),
      recommendations: []
    }

    if (cacheStats.hitRate < 60) {
      metrics.recommendations.push({
        severity: 'high',
        message: 'Cache hit rate is below 60%. Consider increasing TTL values or reviewing cache invalidation strategy.',
      })
    }

    if (cacheStats.hitRate < 80 && cacheStats.hitRate >= 60) {
      metrics.recommendations.push({
        severity: 'medium',
        message: 'Cache hit rate is good but could be improved. Review frequently accessed endpoints.',
      })
    }

    return NextResponse.json({
      success: true,
      data: metrics
    })
  } catch (err: any) {
    console.error('Performance metrics error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
