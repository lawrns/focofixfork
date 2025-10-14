import { NextRequest } from 'next/server'
import { wrapRoute } from '@/server/http/wrapRoute'
import { GetGoalSchema, UpdateGoalSchema, DeleteGoalSchema } from '@/lib/validation/schemas/goal-api.schema'
import { goalsService } from '@/lib/services/goals.service'
import { ForbiddenError } from '@/server/auth/requireAuth'

interface RouteContext {
  params: {
    id: string
  }
}

/**
 * GET /api/goals/[id] - Get goal details
 */
export async function GET(request: NextRequest, context: RouteContext) {
  return wrapRoute(GetGoalSchema, async ({ user, correlationId }) => {
    const goalId = context.params.id

    const goal = await goalsService.getGoal(goalId, user.id)

    if (!goal) {
      const error: any = new Error('Goal not found')
      error.code = 'GOAL_NOT_FOUND'
      error.statusCode = 404
      throw error
    }

    return goal
  })(request)
}

/**
 * PATCH /api/goals/[id] - Update goal
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  return wrapRoute(UpdateGoalSchema, async ({ input, user, correlationId }) => {
    const goalId = context.params.id

    try {
      const goal = await goalsService.updateGoal(goalId, user.id, input.body as any)
      return goal
    } catch (error) {
      if (error instanceof Error && error.message === 'Access denied') {
        throw new ForbiddenError('You do not have permission to update this goal')
      }
      throw error
    }
  })(request)
}

/**
 * DELETE /api/goals/[id] - Delete goal
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  return wrapRoute(DeleteGoalSchema, async ({ user, correlationId }) => {
    const goalId = context.params.id

    try {
      await goalsService.deleteGoal(goalId, user.id)
      return { message: 'Goal deleted successfully' }
    } catch (error) {
      if (error instanceof Error && error.message === 'Access denied') {
        throw new ForbiddenError('You do not have permission to delete this goal')
      }
      throw error
    }
  })(request)
}
