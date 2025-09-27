import { NextRequest, NextResponse } from 'next/server'
import { analyticsService } from '@/lib/services/analytics.service'
import { AnalyticsExportRequestSchema } from '@/lib/validation/schemas/analytics'

// POST /api/analytics/export - Export analytics data
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate request
    const validationResult = AnalyticsExportRequestSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.issues
        },
        { status: 400 }
      )
    }

    const exportData = await analyticsService.exportAnalytics(
      validationResult.data.timePeriod,
      validationResult.data.format,
      validationResult.data.includeTeamMetrics,
      undefined // projectIds will be filtered based on user access
    )

    // For CSV format, return the data directly
    if (validationResult.data.format === 'csv') {
      return new NextResponse(exportData.data, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${exportData.filename}"`
        }
      })
    }

    // For JSON format, return JSON response
    return NextResponse.json({
      data: exportData.data,
      filename: exportData.filename
    })
  } catch (error) {
    console.error('POST /api/analytics/export error:', error)

    if (error instanceof Error && error.message === 'User not authenticated') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to export analytics data' },
      { status: 500 }
    )
  }
}

