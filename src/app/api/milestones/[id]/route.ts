import { NextRequest } from 'next/server'
import { wrapRoute } from '@/server/http/wrapRoute'
import { GetMilestoneSchema, UpdateMilestoneSchema, DeleteMilestoneSchema } from '@/lib/validation/schemas/milestone-api.schema'
import { MilestonesService } from '../../../../lib/services/milestones'
import { z } from 'zod'

// Schema for status updates (PATCH method)
const UpdateStatusSchema = z.object({
  body: z.object({
    status: z.enum(['planned', 'active', 'completed', 'cancelled'])
  }).strict(),
  query: z.object({}).optional()
})

interface RouteContext {
  params: {
    id: string
  }
}

/**
 * GET /api/milestones/[id] - Get a specific milestone
 */
export async function GET(request: NextRequest, context: RouteContext) {
  return wrapRoute(GetMilestoneSchema, async ({ user, correlationId }) => {
    const milestoneId = context.params.id

    if (!milestoneId) {
      const err: any = new Error('Milestone ID is required')
      err.code = 'INVALID_MILESTONE_ID'
      err.statusCode = 400
      throw err
    }

    const result = await MilestonesService.getMilestoneById(user.id, milestoneId)

    if (!result.success) {
      if (result.error === 'Milestone not found') {
        const err: any = new Error('Milestone not found')
        err.code = 'MILESTONE_NOT_FOUND'
        err.statusCode = 404
        throw err
      }
      const err: any = new Error(result.error || 'Failed to fetch milestone')
      err.code = 'DATABASE_ERROR'
      err.statusCode = 500
      throw err
    }

    return result.data
  })(request)
}

/**
 * PUT /api/milestones/[id] - Update a specific milestone
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  return wrapRoute(UpdateMilestoneSchema, async ({ input, user, correlationId }) => {
    const milestoneId = context.params.id

    if (!milestoneId) {
      const err: any = new Error('Milestone ID is required')
      err.code = 'INVALID_MILESTONE_ID'
      err.statusCode = 400
      throw err
    }

    const result = await MilestonesService.updateMilestone(user.id, milestoneId, input.body as any)

    if (!result.success) {
      if (result.error === 'Milestone not found') {
        const err: any = new Error('Milestone not found')
        err.code = 'MILESTONE_NOT_FOUND'
        err.statusCode = 404
        throw err
      }
      const err: any = new Error(result.error || 'Failed to update milestone')
      err.code = 'DATABASE_ERROR'
      err.statusCode = 500
      throw err
    }

    return result.data
  })(request)
}

/**
 * PATCH /api/milestones/[id] - Update milestone status (convenience endpoint)
 * Can also handle /status suffix for explicit status updates
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  return wrapRoute(UpdateStatusSchema, async ({ input, user, correlationId, req }) => {
    const milestoneId = context.params.id

    if (!milestoneId) {
      const err: any = new Error('Milestone ID is required')
      err.code = 'INVALID_MILESTONE_ID'
      err.statusCode = 400
      throw err
    }

    // Check if this is a status update
    const url = new URL(req.url)
    const isStatusUpdate = url.pathname.endsWith('/status')

    // Handle special status updates
    if (input.body.status === 'completed') {
      const result = await MilestonesService.completeMilestone(user.id, milestoneId)

      if (!result.success) {
        if (result.error === 'Milestone not found') {
          const err: any = new Error('Milestone not found')
          err.code = 'MILESTONE_NOT_FOUND'
          err.statusCode = 404
          throw err
        }
        const err: any = new Error(result.error || 'Failed to complete milestone')
        err.code = 'DATABASE_ERROR'
        err.statusCode = 500
        throw err
      }

      return result.data
    }

    // Regular status update
    const result = await MilestonesService.updateMilestone(user.id, milestoneId, {
      status: input.body.status
    })

    if (!result.success) {
      if (result.error === 'Milestone not found') {
        const err: any = new Error('Milestone not found')
        err.code = 'MILESTONE_NOT_FOUND'
        err.statusCode = 404
        throw err
      }
      const err: any = new Error(result.error || 'Failed to update milestone status')
      err.code = 'DATABASE_ERROR'
      err.statusCode = 500
      throw err
    }

    return result.data
  })(request)
}

/**
 * DELETE /api/milestones/[id] - Delete a specific milestone
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  return wrapRoute(DeleteMilestoneSchema, async ({ user, correlationId }) => {
    const milestoneId = context.params.id

    if (!milestoneId) {
      const err: any = new Error('Milestone ID is required')
      err.code = 'INVALID_MILESTONE_ID'
      err.statusCode = 400
      throw err
    }

    const result = await MilestonesService.deleteMilestone(user.id, milestoneId)

    if (!result.success) {
      if (result.error === 'Milestone not found') {
        const err: any = new Error('Milestone not found')
        err.code = 'MILESTONE_NOT_FOUND'
        err.statusCode = 404
        throw err
      }
      const err: any = new Error(result.error || 'Failed to delete milestone')
      err.code = 'DATABASE_ERROR'
      err.statusCode = 500
      throw err
    }

    return { message: 'Milestone deleted successfully' }
  })(request)
}
