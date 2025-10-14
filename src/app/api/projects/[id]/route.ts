import { NextRequest } from 'next/server'
import { wrapRoute } from '@/server/http/wrapRoute'
import { ProjectsService } from '@/features/projects/services/projectService'
import {
  GetProjectSchema,
  UpdateProjectApiSchema,
  DeleteProjectSchema
} from '@/lib/validation/schemas/project-api.schema'
import { ForbiddenError } from '@/server/auth/requireAuth'

interface RouteContext {
  params: {
    id: string
  }
}

/**
 * GET /api/projects/[id] - Get a specific project
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  return wrapRoute(GetProjectSchema, async ({ user, correlationId }) => {
    const projectId = context.params.id

    // Validate project ID
    if (!projectId || projectId === 'undefined' || projectId === 'null') {
      const error: any = new Error('Valid project ID is required')
      error.code = 'INVALID_PROJECT_ID'
      error.statusCode = 400
      throw error
    }

    // Fetch project using user's Supabase client (RLS enforced)
    const result = await ProjectsService.getProjectById(user.id, projectId)

    if (!result.success) {
      // Determine if 403 (forbidden) or 404 (not found)
      if (result.error?.includes('not found')) {
        // Could be either no access or doesn't exist
        // Check if project exists at all (using service role if needed)
        const error: any = new Error('Project not found or access denied')
        error.code = 'PROJECT_NOT_FOUND'
        error.statusCode = 404
        throw error
      } else if (result.error?.includes('access denied')) {
        // User tried to access a project they don't have permission for
        throw new ForbiddenError('You do not have permission to access this project')
      } else {
        // Database or other error
        const error: any = new Error(result.error || 'Failed to fetch project')
        error.code = 'INTERNAL_ERROR'
        error.statusCode = 500
        throw error
      }
    }

    return result.data
  })(request)
}

/**
 * PUT /api/projects/[id] - Update a specific project
 */
export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  return wrapRoute(UpdateProjectApiSchema, async ({ input, user, correlationId }) => {
    const projectId = context.params.id

    // Validate project ID
    if (!projectId || projectId === 'undefined' || projectId === 'null') {
      const error: any = new Error('Valid project ID is required')
      error.code = 'INVALID_PROJECT_ID'
      error.statusCode = 400
      throw error
    }

    // Transform null values to undefined for service compatibility
    const updateData = {
      ...input.body,
      description: input.body.description === null ? undefined : input.body.description,
      start_date: input.body.start_date === null ? undefined : input.body.start_date,
      due_date: input.body.due_date === null ? undefined : input.body.due_date,
    }

    // Update project (permission check happens in service layer via RLS)
    const result = await ProjectsService.updateProject(user.id, projectId, updateData)

    if (!result.success) {
      // Determine appropriate error
      if (result.error === 'Project not found') {
        const error: any = new Error('Project not found')
        error.code = 'PROJECT_NOT_FOUND'
        error.statusCode = 404
        throw error
      } else if (result.error?.includes('access denied') || result.error?.includes('permission')) {
        throw new ForbiddenError('You do not have permission to update this project')
      } else if (result.error?.includes('already exists')) {
        const error: any = new Error(result.error)
        error.code = 'CONFLICT'
        error.statusCode = 409
        throw error
      } else if (result.error?.includes('Invalid') || result.error?.includes('check your')) {
        const error: any = new Error(result.error)
        error.code = 'VALIDATION_ERROR'
        error.statusCode = 400
        throw error
      } else {
        const error: any = new Error(result.error || 'Failed to update project')
        error.code = 'INTERNAL_ERROR'
        error.statusCode = 500
        throw error
      }
    }

    return result.data
  })(request)
}

/**
 * DELETE /api/projects/[id] - Delete a specific project
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  return wrapRoute(DeleteProjectSchema, async ({ user, correlationId }) => {
    const projectId = context.params.id

    // Validate project ID
    if (!projectId || projectId === 'undefined' || projectId === 'null') {
      const error: any = new Error('Valid project ID is required')
      error.code = 'INVALID_PROJECT_ID'
      error.statusCode = 400
      throw error
    }

    // Delete project (permission check via RLS)
    const result = await ProjectsService.deleteProject(user.id, projectId)

    if (!result.success) {
      if (result.error === 'Project not found') {
        const error: any = new Error('Project not found')
        error.code = 'PROJECT_NOT_FOUND'
        error.statusCode = 404
        throw error
      } else if (result.error?.includes('access denied') || result.error?.includes('permission')) {
        throw new ForbiddenError('You do not have permission to delete this project')
      } else {
        const error: any = new Error(result.error || 'Failed to delete project')
        error.code = 'INTERNAL_ERROR'
        error.statusCode = 500
        throw error
      }
    }

    return { message: 'Project deleted successfully' }
  })(request)
}
