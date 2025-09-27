import { NextRequest, NextResponse } from 'next/server'
import { settingsService } from '@/lib/services/settings.service'
import { DataExportRequestSchema } from '@/lib/validation/schemas/settings'

// POST /api/user/export - Export user data
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate request
    const validationResult = DataExportRequestSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.issues
        },
        { status: 400 }
      )
    }

    const exportResult = await settingsService.exportUserData(validationResult.data)

    // For JSON format, return the data directly
    if (validationResult.data.format === 'json') {
      return NextResponse.json({
        data: exportResult,
        message: 'Export initiated. Check your email for download link.'
      })
    }

    // For other formats, return export status
    return NextResponse.json({
      data: exportResult,
      message: 'Export initiated successfully'
    })
  } catch (error) {
    console.error('POST /api/user/export error:', error)

    if (error instanceof Error && error.message === 'User not authenticated') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to initiate data export' },
      { status: 500 }
    )
  }
}

