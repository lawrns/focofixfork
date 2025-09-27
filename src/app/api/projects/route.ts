import { NextRequest, NextResponse } from 'next/server'
import { ProjectsService } from '@/lib/services/projects'
import { z } from 'zod'

// Schema for project creation
const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(500, 'Name must be less than 500 characters'),
  description: z.string().max(2000, 'Description must be less than 2000 characters').optional(),
  organization_id: z.string().nullable().optional(),
  status: z.enum(['planning', 'active', 'on_hold', 'completed', 'cancelled']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  start_date: z.string().optional(),
  due_date: z.string().optional(),
  progress_percentage: z.number().min(0).max(100).optional(),
})

/**
 * GET /api/projects - List projects for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    let userId = request.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const organizationId = searchParams.get('organization_id') || undefined
    const status = searchParams.get('status') || undefined
    const priority = searchParams.get('priority') || undefined
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 10
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0

    const result = await ProjectsService.getUserProjects(userId, {
      organization_id: organizationId,
      status,
      priority,
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
    console.error('Projects API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/projects - Create a new project
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json()

    // Validate request body
    const validationResult = createProjectSchema.safeParse(body)
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

        // Temporarily allow project creation without organization requirement
        const projectData = { ...validationResult.data, organization_id: null }
        const result = await ProjectsService.createProject(userId, projectData as any)

    if (!result.success) {
      // Determine appropriate HTTP status code based on error type
      let statusCode = 500
      if (result.error?.includes('already exists')) {
        statusCode = 409 // Conflict
      } else if (result.error?.includes('Invalid') || result.error?.includes('check your')) {
        statusCode = 400 // Bad Request
      }

      return NextResponse.json(
        { success: false, error: result.error },
        { status: statusCode }
      )
    }

    return NextResponse.json(
      { success: true, data: result.data },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Project creation API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}