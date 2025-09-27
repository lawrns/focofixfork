import { NextRequest, NextResponse } from 'next/server'
import { analyticsService } from '@/lib/services/analytics.service'
import { TimePeriodSchema } from '@/lib/validation/schemas/analytics'

// GET /api/analytics/team - Get team productivity metrics
export async function GET(request: NextRequest) {
  try {
    let userId = request.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
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
          error: 'Invalid time period',
          details: timePeriodResult.error.issues
        },
        { status: 400 }
      )
    }

    try {
      // Get team metrics using the service method
      const dashboard = await analyticsService.getDashboardAnalytics(
        userId,
        timePeriodResult.data,
        organizationId
      )
      const teamMetrics = dashboard.teamMetrics

      return NextResponse.json({ data: teamMetrics })
    } catch (dbError) {
      console.warn('Analytics service not available, returning empty data:', dbError)
      // Return empty team metrics if database tables don't exist
      return NextResponse.json({
        data: {
          totalMembers: 0,
          activeMembers: 0,
          averageTasksPerMember: 0,
          teamProductivity: 0
        }
      })
    }
  } catch (error) {
    console.error('GET /api/analytics/team error:', error)

    if (error instanceof Error && error.message === 'User not authenticated') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch team analytics' },
      { status: 500 }
    )
  }
}

