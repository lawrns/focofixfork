import { NextRequest, NextResponse } from 'next/server'
import { settingsService } from '@/lib/services/settings.service'
import { UserSettingsUpdateSchema } from '@/lib/validation/schemas/settings'

// GET /api/user/settings - Get user settings
export async function GET(request: NextRequest) {
  try {
    const settings = await settingsService.getUserSettings()

    return NextResponse.json({ data: settings })
  } catch (error) {
    console.error('GET /api/user/settings error:', error)

    if (error instanceof Error && error.message === 'User not authenticated') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

// PATCH /api/user/settings - Update user settings
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate input
    const validationResult = UserSettingsUpdateSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.issues
        },
        { status: 400 }
      )
    }

    const settings = await settingsService.updateUserSettings(validationResult.data)

    return NextResponse.json({ data: settings })
  } catch (error) {
    console.error('PATCH /api/user/settings error:', error)

    if (error instanceof Error && error.message === 'User not authenticated') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    )
  }
}

