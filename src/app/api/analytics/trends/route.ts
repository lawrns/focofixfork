import { NextRequest } from 'next/server'
import { wrapRoute } from '@/server/http/wrapRoute'
import { GetTrendsAnalyticsSchema } from '@/lib/validation/schemas/analytics-api.schema'
import { analyticsService } from '@/lib/services/analytics.service'
import { TrendsQueryParamsSchema } from '@/lib/validation/schemas/analytics'

// CONSOLIDATE: Merge into /api/analytics?type=trends
// This route can be consolidated into a unified analytics endpoint with query parameters.
// Migration: GET /api/analytics?type=trends&metric=...&startDate=...&endDate=...

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  return wrapRoute(GetTrendsAnalyticsSchema, async ({ input, user, correlationId }) => {
    const queryParams = {
      metric: input.query?.metric,
      startDate: input.query?.startDate,
      endDate: input.query?.endDate,
      projectId: input.query?.projectId,
      userId: input.query?.userId
    }

    const validationResult = TrendsQueryParamsSchema.safeParse(queryParams)
    if (!validationResult.success) {
      const err: any = new Error('Invalid query parameters')
      err.code = 'VALIDATION_ERROR'
      err.statusCode = 400
      err.details = validationResult.error.issues
      throw err
    }

    try {
      const trendsData = await analyticsService.getTrendsData(validationResult.data)
      return trendsData
    } catch (dbError) {
      // Return empty trends data if database tables don't exist
      return []
    }
  })(request)
}

