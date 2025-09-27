import { NextRequest, NextResponse } from 'next/server'
import { goalsService } from '@/lib/services/goals.service'
import { CreateGoalSchema } from '@/lib/validation/schemas/goals'

// GET /api/goals - List goals
export async function GET(request: NextRequest) {
  try {
    let userId = request.headers.get('x-user-id')

    // For demo purposes, allow real user
    if (!userId || userId === 'demo-user-123') {
      userId = '0c2af3ff-bd5e-4fbe-b8e2-b5b73266b562'
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0)

    const goals = await goalsService.getGoals(userId)

    // Apply pagination
    const paginatedGoals = goals.slice(offset, offset + limit)
    const totalCount = goals.length
    const hasMore = offset + limit < totalCount

    return NextResponse.json({
      success: true,
      data: paginatedGoals,
      pagination: {
        limit,
        offset,
        total: totalCount,
        hasMore
      }
    })
  } catch (error) {
    console.error('GET /api/goals error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch goals', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

// POST /api/goals - Create goal
export async function POST(request: NextRequest) {
  try {
    let userId = request.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()

    // Validate input
    const validationResult = CreateGoalSchema.safeParse(body)
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

    try {
      const goal = await goalsService.createGoal(userId, validationResult.data)

      return NextResponse.json({
        success: true,
        data: goal
      }, { status: 201 })
    } catch (serviceError) {
      console.error('Goals service error:', serviceError)
      return NextResponse.json(
        { success: false, error: 'Failed to create goal', details: serviceError instanceof Error ? serviceError.message : String(serviceError) },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('POST /api/goals error:', error)

    if (error instanceof Error && error.message === 'User not authenticated') {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create goal' },
      { status: 500 }
    )
  }
}

