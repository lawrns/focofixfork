import { NextRequest, NextResponse } from 'next/server'
import { settingsService } from '@/lib/services/settings.service'
import { NotificationPreferencesSchema } from '@/lib/validation/schemas/settings'

// GET /api/user/settings/notifications - Get user notification preferences
export async function GET(request: NextRequest) {
  try {
    const settings = await settingsService.getUserSettings()
    const notifications = settings.notifications

    return NextResponse.json({ data: notifications })
  } catch (error) {
    console.error('GET /api/user/settings/notifications error:', error)

    if (error instanceof Error && error.message === 'User not authenticated') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch notification preferences' },
      { status: 500 }
    )
  }
}

// PATCH /api/user/settings/notifications - Update user notification preferences
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate input
    const validationResult = NotificationPreferencesSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.issues
        },
        { status: 400 }
      )
    }

    // Update only notifications
    const updatedSettings = await settingsService.updateUserSettings({
      notifications: validationResult.data
    })

    return NextResponse.json({ data: updatedSettings.notifications })
  } catch (error) {
    console.error('PATCH /api/user/settings/notifications error:', error)

    if (error instanceof Error && error.message === 'User not authenticated') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update notification preferences' },
      { status: 500 }
    )
  }
}

