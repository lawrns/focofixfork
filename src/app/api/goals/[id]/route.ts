import { NextRequest, NextResponse } from 'next/server'
import { goalsService } from '@/lib/services/goals.service'
import { UpdateGoalSchema } from '@/lib/validation/schemas/goals'

interface RouteParams {
  params: {
    id: string
  }
}

// GET /api/goals/[id] - Get goal details
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

    const goal = await goalsService.getGoal(goalId, userId)

    if (!goal) {
      return NextResponse.json(
        { success: false, error: 'Goal not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: goal
    })
  } catch (error) {
    console.error('GET /api/goals/[id] error:', error)

    if (error instanceof Error && error.message === 'Access denied') {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      )
    }

    if (error instanceof Error && error.message === 'User not authenticated') {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Failed to fetch goal' },
      { status: 500 }
    )
  }
}

// PATCH /api/goals/[id] - Update goal
export async function PATCH(request: NextRequest, { params }: RouteParams) {
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
    const validationResult = UpdateGoalSchema.safeParse(body)
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

    const goal = await goalsService.updateGoal(goalId, userId, validationResult.data)

    return NextResponse.json({
      success: true,
      data: goal
    })
  } catch (error) {
    console.error('PATCH /api/goals/[id] error:', error)

    if (error instanceof Error && error.message === 'Access denied') {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      )
    }

    if (error instanceof Error && error.message === 'User not authenticated') {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update goal' },
      { status: 500 }
    )
  }
}

// DELETE /api/goals/[id] - Delete goal
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = request.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const goalId = params.id

    await goalsService.deleteGoal(goalId, userId)

    return NextResponse.json({
      success: true,
      message: 'Goal deleted successfully'
    })
  } catch (error) {
    console.error('DELETE /api/goals/[id] error:', error)

    if (error instanceof Error && error.message === 'Access denied') {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      )
    }

    if (error instanceof Error && error.message === 'User not authenticated') {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Failed to delete goal' },
      { status: 500 }
    )
  }
}

