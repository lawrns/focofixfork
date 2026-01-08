import { NextRequest } from 'next/server'
import { wrapRoute } from '@/server/http/wrapRoute'
import { GetProjectsAnalyticsSchema } from '@/lib/validation/schemas/analytics-api.schema'
import { analyticsService } from '@/lib/services/analytics.service'
import { TimePeriodSchema } from '@/lib/validation/schemas/analytics'

// CONSOLIDATE: Merge into /api/analytics?type=projects
// This route can be consolidated into a unified analytics endpoint with query parameters.
// Migration: GET /api/analytics?type=projects&timePeriod=30d&organizationId=...

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  return wrapRoute(GetProjectsAnalyticsSchema, async ({ input, user, correlationId }) => {
    const timePeriodParam = input.query?.timePeriod || '30d'
    const organizationId = input.query?.organizationId

    // Validate time period
    const timePeriodResult = TimePeriodSchema.safeParse(timePeriodParam)
    if (!timePeriodResult.success) {
      const err: any = new Error('Invalid time period')
      err.code = 'VALIDATION_ERROR'
      err.statusCode = 400
      err.details = timePeriodResult.error.issues
      throw err
    }

    try {
      // Get project metrics using the service method
      const dashboard = await analyticsService.getDashboardAnalytics(
        user.id,
        timePeriodResult.data,
        organizationId
      )
      return dashboard.projectMetrics
    } catch (dbError) {
      // Return empty metrics if database tables don't exist
      return []
    }
  })(request)
}
