import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'

import { getCacheStats } from '@/lib/cache/redis'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  let authResponse: NextResponse | undefined;
  try {
    const { user, error, response } = await getAuthUser(req)
    authResponse = response;

    if (error || !user) {
      return mergeAuthResponse(NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }), authResponse)
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
      recommendations: [] as { severity: string; message: string }[]
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

    return mergeAuthResponse(NextResponse.json({
      success: true,
      data: metrics
    }), authResponse)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return mergeAuthResponse(NextResponse.json({ success: false, error: message }, { status: 500 }), authResponse)
  }
}
