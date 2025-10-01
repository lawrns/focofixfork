import { NextRequest, NextResponse } from 'next/server'
import { goalsService } from '@/lib/services/goals.service'
import { CreateMilestoneSchema } from '@/lib/validation/schemas/goals'

interface RouteParams {
  params: {
    id: string
  }
}

// GET /api/goals/[id]/milestones - Get milestones for a goal
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = request.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const goalId = params.id

    const milestones = await goalsService.getMilestones(goalId, userId)

    return NextResponse.json({
      success: true,
      data: milestones
    })
  } catch (error) {
    console.error('GET /api/goals/[id]/milestones error:', error)

    if (error instanceof Error && error.message === 'User not authenticated') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch milestones' },
      { status: 500 }
    )
  }
}

// POST /api/goals/[id]/milestones - Create milestone for a goal
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = request.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const goalId = params.id
    const body = await request.json()

    // Validate input
    const validationResult = CreateMilestoneSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validationResult.error.issues
        },
        { status: 400 }
      )
    }

    const milestone = await goalsService.createMilestone(goalId, validationResult.data, userId)

    return NextResponse.json({
      success: true,
      data: milestone
    }, { status: 201 })
  } catch (error) {
    console.error('POST /api/goals/[id]/milestones error:', error)

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
      { error: 'Failed to create milestone' },
      { status: 500 }
    )
  }
}

