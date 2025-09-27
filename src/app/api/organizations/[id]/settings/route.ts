import { NextRequest, NextResponse } from 'next/server'
import { settingsService } from '@/lib/services/settings.service'
import { OrganizationSettingsUpdateSchema } from '@/lib/validation/schemas/settings'

interface RouteParams {
  params: {
    id: string
  }
}

// GET /api/organizations/[id]/settings - Get organization settings
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const organizationId = params.id

    const settings = await settingsService.getOrganizationSettings(organizationId)

    return NextResponse.json({ data: settings })
  } catch (error) {
    console.error('GET /api/organizations/[id]/settings error:', error)

    if (error instanceof Error && error.message === 'Access denied') {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    if (error instanceof Error && error.message === 'User not authenticated') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch organization settings' },
      { status: 500 }
    )
  }
}

// PATCH /api/organizations/[id]/settings - Update organization settings
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const organizationId = params.id
    const body = await request.json()

    // Validate input
    const validationResult = OrganizationSettingsUpdateSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.issues
        },
        { status: 400 }
      )
    }

    const updatedSettings = await settingsService.updateOrganizationSettings(
      organizationId,
      validationResult.data
    )

    return NextResponse.json({ data: updatedSettings })
  } catch (error) {
    console.error('PATCH /api/organizations/[id]/settings error:', error)

    if (error instanceof Error && error.message === 'Admin access required') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    if (error instanceof Error && error.message === 'User not authenticated') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update organization settings' },
      { status: 500 }
    )
  }
}

