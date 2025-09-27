import { NextRequest, NextResponse } from 'next/server'
import { settingsService } from '@/lib/services/settings.service'
import { ProjectSettingsUpdateSchema } from '@/lib/validation/schemas/settings'

interface RouteParams {
  params: {
    id: string
  }
}

// GET /api/projects/[id]/settings - Get project settings
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const projectId = params.id

    const settings = await settingsService.getProjectSettings(projectId)

    return NextResponse.json({ data: settings })
  } catch (error) {
    console.error('GET /api/projects/[id]/settings error:', error)

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
      { error: 'Failed to fetch project settings' },
      { status: 500 }
    )
  }
}

// PATCH /api/projects/[id]/settings - Update project settings
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const projectId = params.id
    const body = await request.json()

    // Validate input
    const validationResult = ProjectSettingsUpdateSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.issues
        },
        { status: 400 }
      )
    }

    const updatedSettings = await settingsService.updateProjectSettings(
      projectId,
      validationResult.data
    )

    return NextResponse.json({ data: updatedSettings })
  } catch (error) {
    console.error('PATCH /api/projects/[id]/settings error:', error)

    if (error instanceof Error && error.message === 'Manager access required') {
      return NextResponse.json(
        { error: 'Manager access required' },
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
      { error: 'Failed to update project settings' },
      { status: 500 }
    )
  }
}

