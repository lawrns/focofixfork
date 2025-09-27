import { NextRequest, NextResponse } from 'next/server'
import { analyticsService } from '@/lib/services/analytics.service'
import { TimePeriodSchema } from '@/lib/validation/schemas/analytics'

// GET /api/analytics/projects - Get project metrics for all accessible projects
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
      // Get project metrics using the service method
      const dashboard = await analyticsService.getDashboardAnalytics(
        userId,
        timePeriodResult.data,
        organizationId
      )
      const metrics = dashboard.projectMetrics

      return NextResponse.json({ data: metrics })
    } catch (dbError) {
      console.warn('Analytics service not available, returning empty data:', dbError)
      // Return empty metrics if database tables don't exist
      return NextResponse.json({ data: [] })
    }
  } catch (error) {
    console.error('GET /api/analytics/projects error:', error)

    if (error instanceof Error && error.message === 'User not authenticated') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch project analytics' },
      { status: 500 }
    )
  }
}
