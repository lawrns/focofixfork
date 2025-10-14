import { NextRequest } from 'next/server'
import { wrapRoute } from '@/server/http/wrapRoute'
import { GetGoalMilestonesSchema, CreateGoalMilestoneSchema } from '@/lib/validation/schemas/goal-api.schema'
import { goalsService } from '@/lib/services/goals.service'
import { ForbiddenError } from '@/server/auth/requireAuth'

interface RouteContext {
  params: {
    id: string
  }
}

/**
 * GET /api/goals/[id]/milestones - Get milestones for a goal
 */
export async function GET(request: NextRequest, context: RouteContext) {
  return wrapRoute(GetGoalMilestonesSchema, async ({ user, correlationId }) => {
    const goalId = context.params.id

    const milestones = await goalsService.getMilestones(goalId, user.id)
    return milestones
  })(request)
}

/**
 * POST /api/goals/[id]/milestones - Create milestone for a goal
 */
export async function POST(request: NextRequest, context: RouteContext) {
  return wrapRoute(CreateGoalMilestoneSchema, async ({ input, user, correlationId }) => {
    const goalId = context.params.id

    try {
      const milestone = await goalsService.createMilestone(goalId, input.body as any, user.id)
      return milestone
    } catch (error: any) {
      if (error.message === 'Access denied') {
        throw new ForbiddenError('You do not have permission to create milestones for this goal')
      }
      throw error
    }
  })(request)
}
