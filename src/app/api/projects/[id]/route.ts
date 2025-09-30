import { NextRequest, NextResponse } from 'next/server'
import { ProjectsService } from '@/lib/services/projects'
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
    const result = await ProjectsService.updateProject(userId, projectId, validationResult.data)
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