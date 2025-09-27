import { NextRequest, NextResponse } from 'next/server'
import { ProjectsService } from '@/lib/services/projects'
import { z } from 'zod'

// Schema for project updates
const updateProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(500, 'Name must be less than 500 characters').optional(),
  description: z.string().max(2000, 'Description must be less than 2000 characters').optional(),
  organization_id: z.string().min(1, 'Organization is required').optional(),
  status: z.enum(['planning', 'active', 'on_hold', 'completed', 'cancelled']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  start_date: z.string().optional(),
  due_date: z.string().optional(),
  progress_percentage: z.number().min(0).max(100).optional(),
})

interface RouteParams {
  params: {
    id: string
  }
}

/**
 * GET /api/projects/[id] - Get a specific project
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

    const projectId = params.id
    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'Project ID is required' },
        { status: 400 }
      )
    }

    const result = await ProjectsService.getProjectById(userId, projectId)

    if (!result.success) {
      const statusCode = result.error === 'Project not found' ? 404 : 500
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
    console.error('Project detail API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/projects/[id] - Update a specific project
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
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

    const projectId = params.id
    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'Project ID is required' },
        { status: 400 }
      )
    }

    const body = await request.json()

    // Validate request body
    const validationResult = updateProjectSchema.safeParse(body)
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

    const result = await ProjectsService.updateProject(userId, projectId, validationResult.data)

    if (!result.success) {
      // Determine appropriate HTTP status code based on error type
      let statusCode = 500
      if (result.error === 'Project not found') {
        statusCode = 404
      } else if (result.error?.includes('already exists')) {
        statusCode = 409 // Conflict
      } else if (result.error?.includes('Invalid') || result.error?.includes('check your')) {
        statusCode = 400 // Bad Request
      }

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
    console.error('Project update API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/projects/[id] - Delete a specific project
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    const projectId = params.id
    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'Project ID is required' },
        { status: 400 }
      )
    }

    const result = await ProjectsService.deleteProject(userId, projectId)

    if (!result.success) {
      // Determine appropriate HTTP status code based on error type
      let statusCode = 500
      if (result.error === 'Project not found') {
        statusCode = 404
      }

      return NextResponse.json(
        { success: false, error: result.error },
        { status: statusCode }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Project deleted successfully',
    })
  } catch (error: any) {
    console.error('Project deletion API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}