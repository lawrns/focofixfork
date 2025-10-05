import { NextRequest, NextResponse } from 'next/server'
import { TasksService } from '@/features/tasks/services/taskService'
import { z } from 'zod'

// Schema for task updates
const updateTaskSchema = z.object({
  title: z.string().min(1, 'Task title is required').max(500, 'Title must be less than 500 characters').optional(),
  description: z.string().max(2000, 'Description must be less than 2000 characters').optional(),
  project_id: z.string().min(1, 'Project is required').optional(),
  milestone_id: z.string().optional(),
  status: z.enum(['todo', 'in_progress', 'review', 'done']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  assignee_id: z.string().optional(),
  estimated_hours: z.number().min(0).max(1000).optional(),
  actual_hours: z.number().min(0).max(1000).optional(),
  due_date: z.string().optional(),
})

// Schema for status updates
const updateStatusSchema = z.object({
  status: z.enum(['todo', 'in_progress', 'review', 'done']),
})

interface RouteParams {
  params: {
    id: string
  }
}

/**
 * GET /api/tasks/[id] - Get a specific task
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

    const taskId = params.id
    if (!taskId) {
      return NextResponse.json(
        { success: false, error: 'Task ID is required' },
        { status: 400 }
      )
    }

    const result = await TasksService.getTaskById(userId, taskId)

    if (!result.success) {
      const statusCode = result.error === 'Task not found' ? 404 : 500
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
    console.error('Task detail API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/tasks/[id] - Update a specific task
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

    const taskId = params.id
    if (!taskId) {
      return NextResponse.json(
        { success: false, error: 'Task ID is required' },
        { status: 400 }
      )
    }

    const body = await request.json()

    // Validate request body
    const validationResult = updateTaskSchema.safeParse(body)
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

    const result = await TasksService.updateTask(userId, taskId, validationResult.data)

    if (!result.success) {
      const statusCode = result.error === 'Task not found' ? 404 : 500
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
    console.error('Task update API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/tasks/[id]/status - Update task status (convenience endpoint)
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

    const taskId = params.id
    if (!taskId) {
      return NextResponse.json(
        { success: false, error: 'Task ID is required' },
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

      const result = await TasksService.updateTaskStatus(userId, taskId, validationResult.data.status)

      if (!result.success) {
        const statusCode = result.error === 'Task not found' ? 404 : 500
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

    // Regular PATCH for other updates
    const body = await request.json()

    const validationResult = updateTaskSchema.safeParse(body)
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

    const result = await TasksService.updateTask(userId, taskId, validationResult.data)

    if (!result.success) {
      const statusCode = result.error === 'Task not found' ? 404 : 500
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
    console.error('Task patch API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/tasks/[id] - Delete a specific task
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

    const taskId = params.id
    if (!taskId) {
      return NextResponse.json(
        { success: false, error: 'Task ID is required' },
        { status: 400 }
      )
    }

    const result = await TasksService.deleteTask(userId, taskId)

    if (!result.success) {
      const statusCode = result.error === 'Task not found' ? 404 : 500
      return NextResponse.json(
        { success: false, error: result.error },
        { status: statusCode }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Task deleted successfully',
    })
  } catch (error: any) {
    console.error('Task deletion API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}


