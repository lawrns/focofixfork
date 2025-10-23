import { NextRequest } from 'next/server'
import { wrapRoute } from '@/server/http/wrapRoute'
import { GetProjectsSchema, CreateProjectApiSchema } from '@/lib/validation/schemas/project-api.schema'
import { ProjectsService } from '@/features/projects/services/projectService'
import { normalizeProjectsData } from '@/lib/utils'

// Configure for Netlify edge runtime with timeout limits
export const runtime = 'edge'
export const maxDuration = 10
export const dynamic = 'force-dynamic'

/**
 * GET /api/projects - List projects for the authenticated user
 */
export async function GET(request: NextRequest) {
  return wrapRoute(GetProjectsSchema, async ({ input, user, correlationId }) => {
    const organizationId = input.query?.organization_id
    const status = input.query?.status
    const priority = input.query?.priority
    const limit = input.query?.limit || 10
    const offset = input.query?.offset || 0

    const result = await ProjectsService.getUserProjects(user.id, {
      organization_id: organizationId,
      status,
      priority,
      limit,
      offset,
    })

    if (!result.success) {
      const err: any = new Error(result.error || 'Failed to fetch projects')
      err.code = 'DATABASE_ERROR'
      err.statusCode = 500
      throw err
    }

    return {
      data: normalizeProjectsData(result.data || []),
      pagination: result.pagination,
    }
  })(request)
}

/**
 * POST /api/projects - Create a new project
 */
export async function POST(request: NextRequest) {
  return wrapRoute(CreateProjectApiSchema, async ({ input, user, correlationId }) => {
    const result = await ProjectsService.createProject(user.id, input.body as any)

    if (!result.success) {
      // Determine appropriate error code and status
      if (result.error?.includes('already exists')) {
        const err: any = new Error(result.error)
        err.code = 'CONFLICT'
        err.statusCode = 409
        throw err
      } else if (result.error?.includes('Invalid') || result.error?.includes('check your')) {
        const err: any = new Error(result.error)
        err.code = 'VALIDATION_ERROR'
        err.statusCode = 400
        throw err
      } else {
        const err: any = new Error(result.error || 'Failed to create project')
        err.code = 'DATABASE_ERROR'
        err.statusCode = 500
        throw err
      }
    }

    return result.data
  })(request)
}
