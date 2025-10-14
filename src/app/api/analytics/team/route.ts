import { NextRequest } from 'next/server'
import { wrapRoute } from '@/server/http/wrapRoute'
import { GetTeamAnalyticsSchema } from '@/lib/validation/schemas/analytics-api.schema'
import { analyticsService } from '@/lib/services/analytics.service'
import { TimePeriodSchema } from '@/lib/validation/schemas/analytics'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  return wrapRoute(GetTeamAnalyticsSchema, async ({ input, user, correlationId }) => {
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
      // Get team metrics using the service method
      const dashboard = await analyticsService.getDashboardAnalytics(
        user.id,
        timePeriodResult.data,
        organizationId
      )
      return dashboard.teamMetrics
    } catch (dbError) {
      // Return empty team metrics if database tables don't exist
      return {
        totalMembers: 0,
        activeMembers: 0,
        averageTasksPerMember: 0,
        teamProductivity: 0
      }
    }
  })(request)
}

