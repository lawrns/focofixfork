import { NextRequest, NextResponse } from 'next/server'
import { analyticsService } from '@/lib/services/analytics.service'
import { TimePeriodSchema } from '@/lib/validation/schemas/analytics'

interface RouteParams {
  params: {
    id: string
  }
}

// GET /api/analytics/projects/[id] - Get detailed analytics for a specific project
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const projectId = params.id
    const { searchParams } = new URL(request.url)
    const timePeriodParam = searchParams.get('timePeriod') || '30d'

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

    const dateRange = {
      start: new Date(Date.now() - (timePeriodParam === '7d' ? 7 : timePeriodParam === '30d' ? 30 : timePeriodParam === '90d' ? 90 : 365) * 24 * 60 * 60 * 1000),
      end: new Date()
    }

    const metrics = await analyticsService.getProjectMetricsDetailed(projectId, dateRange)

    if (!metrics) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: metrics })
  } catch (error) {
    console.error('GET /api/analytics/projects/[id] error:', error)

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

