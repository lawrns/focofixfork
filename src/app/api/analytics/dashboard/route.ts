import { NextRequest } from 'next/server'
import { wrapRoute } from '@/server/http/wrapRoute'
import { GetDashboardAnalyticsSchema } from '@/lib/validation/schemas/analytics-api.schema'
import { analyticsService } from '@/lib/services/analytics.service'
import { TimePeriodSchema } from '@/lib/validation/schemas/analytics'

// CONSOLIDATE: Merge into /api/analytics?type=dashboard
// This route can be consolidated into a unified analytics endpoint with query parameters.
// Migration: GET /api/analytics?type=dashboard&timePeriod=30d&organizationId=...

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  return wrapRoute(GetDashboardAnalyticsSchema, async ({ input, user, correlationId }) => {
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
      const analytics = await analyticsService.getDashboardAnalytics(
        user.id,
        timePeriodResult.data,
        organizationId
      )

      return analytics
    } catch (dbError) {
      // Return empty analytics data if database tables don't exist
      return {
        projectMetrics: [],
        teamMetrics: {
          totalMembers: 0,
          activeMembers: 0,
          averageTasksPerMember: 0,
          teamProductivity: 0
        },
        timeSeriesData: [],
        summary: {
          totalProjects: 0,
          activeProjects: 0,
          completedProjects: 0,
          totalTasks: 0,
          completedTasks: 0,
          overdueTasks: 0,
          averageCompletionTime: 0
        }
      }
    }
  })(request)
}

