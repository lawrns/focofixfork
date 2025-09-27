import { NextRequest, NextResponse } from 'next/server'
import { analyticsService } from '@/lib/services/analytics.service'
import { TrendsQueryParamsSchema } from '@/lib/validation/schemas/analytics'

// GET /api/analytics/trends - Get trends data for specific metrics
export async function GET(request: NextRequest) {
  try {
    let authUserId = request.headers.get('x-user-id')

    if (!authUserId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const metric = searchParams.get('metric')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const projectId = searchParams.get('projectId')
    const userId = searchParams.get('userId')

    // Validate query parameters
    const queryParams = {
      metric,
      startDate,
      endDate,
      projectId,
      userId
    }

    const validationResult = TrendsQueryParamsSchema.safeParse(queryParams)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: validationResult.error.issues
        },
        { status: 400 }
      )
    }

    try {
      const trendsData = await analyticsService.getTrendsData(validationResult.data)
      return NextResponse.json({ data: trendsData })
    } catch (dbError) {
      console.warn('Analytics service not available, returning empty data:', dbError)
      // Return empty trends data if database tables don't exist
      return NextResponse.json({ data: [] })
    }
  } catch (error) {
    console.error('GET /api/analytics/trends error:', error)

    if (error instanceof Error && error.message === 'User not authenticated') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch trends data' },
      { status: 500 }
    )
  }
}

