import { NextRequest, NextResponse } from 'next/server'
import { goalsService } from '@/lib/services/goals.service'
import { CreateGoalProjectLinkSchema } from '@/lib/validation/schemas/goals'
import { supabase } from '@/lib/supabase-client'

interface RouteParams {
  params: {
    id: string
  }
}

// GET /api/goals/[id]/projects - Get projects linked to a goal
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const goalId = params.id

    const projects = await goalsService.getLinkedProjects(goalId)

    return NextResponse.json({ data: projects })
  } catch (error) {
    console.error('GET /api/goals/[id]/projects error:', error)

    if (error instanceof Error && error.message === 'User not authenticated') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch linked projects' },
      { status: 500 }
    )
  }
}

// POST /api/goals/[id]/projects - Link a project to a goal
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const goalId = params.id
    const body = await request.json()

    // Validate input
    const validationResult = CreateGoalProjectLinkSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.issues
        },
        { status: 400 }
      )
    }

    const link = await goalsService.linkProject(goalId, validationResult.data.projectId)

    return NextResponse.json({ data: link }, { status: 201 })
  } catch (error) {
    console.error('POST /api/goals/[id]/projects error:', error)

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

    if (error instanceof Error && error.message === 'Project access denied') {
      return NextResponse.json(
        { error: 'Project access denied' },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to link project' },
      { status: 500 }
    )
  }
}

// DELETE /api/goals/[id]/projects - Unlink a project from a goal
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const goalId = params.id
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId query parameter is required' },
        { status: 400 }
      )
    }

    await goalsService.unlinkProject(goalId, projectId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/goals/[id]/projects error:', error)

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
      { error: 'Failed to unlink project' },
      { status: 500 }
    )
  }
}

