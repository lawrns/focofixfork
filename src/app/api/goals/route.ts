import { NextRequest } from 'next/server'
import { wrapRoute } from '@/server/http/wrapRoute'
import { GetGoalsSchema, CreateGoalApiSchema } from '@/lib/validation/schemas/goal-api.schema'
import { goalsService } from '@/lib/services/goals.service'

/**
 * GET /api/goals - List goals
 */
export async function GET(request: NextRequest) {
  return wrapRoute(GetGoalsSchema, async ({ input, user, correlationId }) => {
    const limit = input.query?.limit || 50
    const offset = input.query?.offset || 0

    const goals = await goalsService.getGoals(user.id)

    // Apply pagination
    const paginatedGoals = goals.slice(offset, offset + limit)
    const totalCount = goals.length
    const hasMore = offset + limit < totalCount

    return {
      data: paginatedGoals,
      pagination: {
        limit,
        offset,
        total: totalCount,
        hasMore
      }
    }
  })(request)
}

/**
 * POST /api/goals - Create goal
 */
export async function POST(request: NextRequest) {
  return wrapRoute(CreateGoalApiSchema, async ({ input, user, correlationId }) => {
    const goal = await goalsService.createGoal(user.id, input.body as any)
    return goal
  })(request)
}
