import { NextRequest, NextResponse } from 'next/server'
import { analyticsService } from '@/lib/services/analytics.service'
import { TimePeriodSchema } from '@/lib/validation/schemas/analytics'

// GET /api/analytics/dashboard - Get dashboard analytics
export async function GET(request: NextRequest) {
  try {
    let userId = request.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const timePeriodParam = searchParams.get('timePeriod') || '30d'
    const organizationId = searchParams.get('organizationId') || undefined

    // Validate time period
    const timePeriodResult = TimePeriodSchema.safeParse(timePeriodParam)
    if (!timePeriodResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid time period',
          details: timePeriodResult.error.issues
        },
        { status: 400 }
      )
    }

    try {
      const analytics = await analyticsService.getDashboardAnalytics(
        userId,
        timePeriodResult.data,
        organizationId
      )

      return NextResponse.json({
        success: true,
        data: analytics
      })
    } catch (dbError) {
      console.warn('Analytics service not available, returning empty data:', dbError)
      // Return empty analytics data if database tables don't exist
      return NextResponse.json({
        success: true,
        data: {
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
      })
    }
  } catch (error) {
    console.error('GET /api/analytics/dashboard error:', error)

    if (error instanceof Error && error.message === 'User not authenticated') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}

