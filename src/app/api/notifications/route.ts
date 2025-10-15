import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/server/auth/requireAuth'

/**
 * GET /api/notifications - Get user notifications
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()

    // For now, return empty array since notifications feature isn't fully implemented
    // TODO: Implement proper notifications system
    return NextResponse.json({
      success: true,
      data: [],
      pagination: {
        total: 0,
        limit: 10,
        offset: 0
      }
    })
  } catch (error: any) {
    console.error('Notifications API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'Failed to fetch notifications'
        }
      },
      { status: 500 }
    )
  }
}
