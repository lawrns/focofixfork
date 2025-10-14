import { NextRequest } from 'next/server'
import { wrapRoute } from '@/server/http/wrapRoute'
import { GetMilestonesSchema, CreateMilestoneSchema } from '@/lib/validation/schemas/milestone-api.schema'
import { MilestonesService } from '../../../lib/services/milestones'

/**
 * GET /api/milestones - List milestones for the authenticated user
 */
export async function GET(request: NextRequest) {
  return wrapRoute(GetMilestonesSchema, async ({ input, user, correlationId }) => {
    const projectId = input.query?.project_id
    const status = input.query?.status
    const limit = input.query?.limit || 10
    const offset = input.query?.offset || 0
    const withTaskCounts = input.query?.with_task_counts || false

    // Use the task counts endpoint if requested
    if (withTaskCounts && projectId) {
      const result = await MilestonesService.getMilestonesWithTaskCounts(user.id, projectId)

      if (!result.success) {
        const err: any = new Error(result.error || 'Failed to fetch milestones with task counts')
        err.code = 'DATABASE_ERROR'
        err.statusCode = 500
        throw err
      }

      return result.data
    }

    const result = await MilestonesService.getUserMilestones(user.id, {
      project_id: projectId,
      status,
      limit,
      offset,
    })

    if (!result.success) {
      const err: any = new Error(result.error || 'Failed to fetch milestones')
      err.code = 'DATABASE_ERROR'
      err.statusCode = 500
      throw err
    }

    return {
      data: result.data,
      pagination: result.pagination,
    }
  })(request)
}

/**
 * POST /api/milestones - Create a new milestone
 */
export async function POST(request: NextRequest) {
  return wrapRoute(CreateMilestoneSchema, async ({ input, user, correlationId }) => {
    const result = await MilestonesService.createMilestone(user.id, input.body as any)

    if (!result.success) {
      const err: any = new Error(result.error || 'Failed to create milestone')
      err.code = 'DATABASE_ERROR'
      err.statusCode = 500
      throw err
    }

    return result.data
  })(request)
}
