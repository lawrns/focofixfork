import { NextRequest, NextResponse } from 'next/server'
import { MilestonesService } from '../../../../lib/services/milestones'
import { z } from 'zod'

// Schema for milestone updates
const updateMilestoneSchema = z.object({
  name: z.string().min(1, 'Milestone name is required').max(500, 'Name must be less than 500 characters').optional(),
  description: z.string().max(2000, 'Description must be less than 2000 characters').optional(),
  project_id: z.string().min(1, 'Project is required').optional(),
  status: z.enum(['planned', 'active', 'completed', 'cancelled']).optional(),
  progress_percentage: z.number().min(0).max(100).optional(),
  due_date: z.string().optional(),
  completion_date: z.string().optional(),
})

// Schema for status updates
const updateStatusSchema = z.object({
  status: z.enum(['planned', 'active', 'completed', 'cancelled']),
})

interface RouteParams {
  params: {
    id: string
  }
}

/**
 * GET /api/milestones/[id] - Get a specific milestone
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const milestoneId = params.id
    if (!milestoneId) {
      return NextResponse.json(
        { success: false, error: 'Milestone ID is required' },
        { status: 400 }
      )
    }

    const result = await MilestonesService.getMilestoneById(userId, milestoneId)

    if (!result.success) {
      const statusCode = result.error === 'Milestone not found' ? 404 : 500
      return NextResponse.json(
        { success: false, error: result.error },
        { status: statusCode }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    })
  } catch (error: any) {
    console.error('Milestone detail API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/milestones/[id] - Update a specific milestone
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const milestoneId = params.id
    if (!milestoneId) {
      return NextResponse.json(
        { success: false, error: 'Milestone ID is required' },
        { status: 400 }
      )
    }

    const body = await request.json()

    // Validate request body
    const validationResult = updateMilestoneSchema.safeParse(body)
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

    const result = await MilestonesService.updateMilestone(userId, milestoneId, validationResult.data)

    if (!result.success) {
      const statusCode = result.error === 'Milestone not found' ? 404 : 500
      return NextResponse.json(
        { success: false, error: result.error },
        { status: statusCode }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    })
  } catch (error: any) {
    console.error('Milestone update API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/milestones/[id]/status - Update milestone status (convenience endpoint)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const milestoneId = params.id
    if (!milestoneId) {
      return NextResponse.json(
        { success: false, error: 'Milestone ID is required' },
        { status: 400 }
      )
    }

    // Check if this is a status update
    const url = new URL(request.url)
    const isStatusUpdate = url.pathname.endsWith('/status')

    if (isStatusUpdate) {
      const body = await request.json()

      // Validate status update
      const validationResult = updateStatusSchema.safeParse(body)
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

      // Handle special status updates
      if (validationResult.data.status === 'completed') {
        const result = await MilestonesService.completeMilestone(userId, milestoneId)

        if (!result.success) {
          const statusCode = result.error === 'Milestone not found' ? 404 : 500
          return NextResponse.json(
            { success: false, error: result.error },
            { status: statusCode }
          )
        }

        return NextResponse.json({
          success: true,
          data: result.data,
        })
      } else {
        // Regular status update
        const result = await MilestonesService.updateMilestone(userId, milestoneId, {
          status: validationResult.data.status
        })

        if (!result.success) {
          const statusCode = result.error === 'Milestone not found' ? 404 : 500
          return NextResponse.json(
            { success: false, error: result.error },
            { status: statusCode }
          )
        }

        return NextResponse.json({
          success: true,
          data: result.data,
        })
      }
    }

    // Regular PATCH for other updates
    const body = await request.json()

    const validationResult = updateMilestoneSchema.safeParse(body)
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

    const result = await MilestonesService.updateMilestone(userId, milestoneId, validationResult.data)

    if (!result.success) {
      const statusCode = result.error === 'Milestone not found' ? 404 : 500
      return NextResponse.json(
        { success: false, error: result.error },
        { status: statusCode }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    })
  } catch (error: any) {
    console.error('Milestone patch API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/milestones/[id] - Delete a specific milestone
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const milestoneId = params.id
    if (!milestoneId) {
      return NextResponse.json(
        { success: false, error: 'Milestone ID is required' },
        { status: 400 }
      )
    }

    const result = await MilestonesService.deleteMilestone(userId, milestoneId)

    if (!result.success) {
      const statusCode = result.error === 'Milestone not found' ? 404 : 500
      return NextResponse.json(
        { success: false, error: result.error },
        { status: statusCode }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Milestone deleted successfully',
    })
  } catch (error: any) {
    console.error('Milestone deletion API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}