import { NextRequest, NextResponse } from 'next/server'
import { MilestonesService } from '../../../lib/services/milestones'
import { z } from 'zod'

// Schema for milestone creation
const createMilestoneSchema = z.object({
  name: z.string().min(1, 'Milestone name is required').max(500, 'Name must be less than 500 characters'),
  description: z.string().max(2000, 'Description must be less than 2000 characters').optional(),
  project_id: z.string().min(1, 'Project is required'),
  status: z.enum(['red', 'yellow', 'green']).default('yellow'),
  progress_percentage: z.number().min(0).max(100).default(0),
  deadline: z.string().min(1, 'Deadline is required'),
  due_date: z.string().optional(),
  completion_date: z.string().optional(),
})

/**
 * GET /api/milestones - List milestones for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const projectId = searchParams.get('project_id') || undefined
    const status = searchParams.get('status') || undefined
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 10
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0

    const result = await MilestonesService.getUserMilestones(userId, {
      project_id: projectId,
      status,
      limit,
      offset,
    })

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    })
  } catch (error: any) {
    console.error('Milestones API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/milestones - Create a new milestone
 */
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()

    // Validate request body
    const validationResult = createMilestoneSchema.safeParse(body)
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

    const result = await MilestonesService.createMilestone(userId, validationResult.data as any)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { success: true, data: result.data },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Milestone creation API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}