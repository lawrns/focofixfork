import { NextRequest, NextResponse } from 'next/server'
import { ProjectsService } from '@/features/projects/services/projectService'
import { UpdateProjectSchema } from '@/lib/validation/schemas/project.schema'

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
    console.log(`[API] GET /api/projects/${params.id} - userId: ${userId}`)

    if (!userId) {
      console.warn(`[API] Unauthorized access attempt to project ${params.id}`)
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        },
        { status: 401 }
      )
    }

    const projectId = params.id
    if (!projectId || projectId === 'undefined' || projectId === 'null') {
      console.error(`[API] Invalid project ID: ${projectId}`)
      return NextResponse.json(
        {
          success: false,
          error: 'Valid project ID is required',
          code: 'INVALID_PROJECT_ID'
        },
        { status: 400 }
      )
    }

    const result = await ProjectsService.getProjectById(userId, projectId)

    if (!result.success) {
      // Better error categorization
      let statusCode = 500
      let errorCode = 'INTERNAL_ERROR'

      if (result.error?.includes('not found') || result.error?.includes('access denied')) {
        statusCode = 404
        errorCode = 'PROJECT_NOT_FOUND'
        console.warn(`[API] Project ${projectId} not found or access denied for user ${userId}`)
      } else if (result.error?.includes('database')) {
        statusCode = 503
        errorCode = 'DATABASE_ERROR'
        console.error(`[API] Database error fetching project ${projectId}:`, result.error)
      } else {
        console.error(`[API] Error fetching project ${projectId}:`, result.error)
      }

      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to fetch project',
          code: errorCode,
          projectId
        },
        { status: statusCode }
      )
    }

    console.log(`[API] Successfully fetched project ${projectId} for user ${userId}`)
    return NextResponse.json({
      success: true,
      data: result.data,
    })
  } catch (error: any) {
    console.error(`[API] Unexpected error in GET /api/projects/${params.id}:`, error)
    return NextResponse.json(
      {
        success: false,
        error: 'An unexpected error occurred',
        code: 'UNEXPECTED_ERROR',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/projects/[id] - Update a specific project
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

    console.log('API PUT /api/projects/[id]: Starting update for projectId:', params.id)
    console.log('Using userId:', userId)

    const projectId = params.id
    if (!projectId) {
      console.log('API PUT /api/projects/[id]: No projectId provided')
      return NextResponse.json(
        { success: false, error: 'Project ID is required' },
        { status: 400 }
      )
    }

    const body = await request.json()
    console.log('API PUT /api/projects/[id]: Request body:', body)
    console.log('API PUT /api/projects/[id]: Field types:', {
      name: typeof body.name,
      description: typeof body.description,
      status: typeof body.status,
      priority: typeof body.priority,
      start_date: typeof body.start_date,
      due_date: typeof body.due_date,
      progress_percentage: typeof body.progress_percentage
    })

    // Validate request body
    const validationResult = UpdateProjectSchema.safeParse(body)
    if (!validationResult.success) {
      console.log('API PUT /api/projects/[id]: Validation failed:', validationResult.error.issues)
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validationResult.error.issues
        },
        { status: 400 }
      )
    }

    console.log('API PUT /api/projects/[id]: Validation passed, calling updateProject')
    // Transform null values to undefined for compatibility with service expectations
    const updateData = {
      ...validationResult.data,
      description: validationResult.data.description === null ? undefined : validationResult.data.description,
      start_date: validationResult.data.start_date === null ? undefined : validationResult.data.start_date,
      due_date: validationResult.data.due_date === null ? undefined : validationResult.data.due_date,
    }
    const result = await ProjectsService.updateProject(userId, projectId, updateData)
    console.log('API PUT /api/projects/[id]: Update result:', { success: result.success, error: result.error })

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
    console.log('API DELETE /api/projects/[id]: Starting deletion for projectId:', params.id)
    let userId = request.headers.get('x-user-id')
    console.log('API DELETE /api/projects/[id]: userId from header:', userId)

    if (!userId) {
      console.log('API DELETE /api/projects/[id]: No userId provided')
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const projectId = params.id
    if (!projectId) {
      console.log('API DELETE /api/projects/[id]: No projectId provided')
      return NextResponse.json(
        { success: false, error: 'Project ID is required' },
        { status: 400 }
      )
    }

    console.log('API DELETE /api/projects/[id]: Calling deleteProject')
    const result = await ProjectsService.deleteProject(userId, projectId)
    console.log('API DELETE /api/projects/[id]: Delete result:', { success: result.success, error: result.error })

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