/**
 * Goal Service Adapter
 *
 * This adapter provides a backwards-compatible interface to the consolidated
 * goals service while maintaining the feature's expected API.
 */

import { GoalsService } from '@/lib/services/goals.service'
import type { Goal, CreateGoal, UpdateGoal } from '@/lib/validation/schemas/goals'

interface ServiceResult<T> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Goal service adapter that wraps the consolidated GoalsService
 * with a feature-friendly API
 */
class GoalServiceAdapter {
  /**
   * Get all goals with optional filters
   */
  async getGoals(
    organizationId?: string,
    projectId?: string,
    userId?: string
  ): Promise<Goal[]> {
    if (!userId) {
      throw new Error('User ID is required')
    }
    return GoalsService.getGoals(userId, organizationId, projectId)
  }

  /**
   * Get a single goal by ID
   */
  async getGoalById(id: string): Promise<Goal | null> {
    // For now, we'll need to get the userId from the session
    // This should ideally come from a context or session
    const userId = 'current-user' // TODO: Get from session/context
    const goalWithDetails = await GoalsService.getGoal(id, userId)
    return goalWithDetails as Goal | null
  }

  /**
   * Create a new goal
   */
  async createGoal(goalData: CreateGoal & { userId: string }): Promise<ServiceResult<Goal>> {
    try {
      const { userId, ...data } = goalData
      const goal = await GoalsService.createGoal(userId, data as CreateGoal)
      return { success: true, data: goal }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create goal'
      }
    }
  }

  /**
   * Update an existing goal
   */
  async updateGoal(id: string, updates: UpdateGoal & { userId: string }): Promise<ServiceResult<Goal>> {
    try {
      const { userId, ...data } = updates
      const goal = await GoalsService.updateGoal(id, userId, data as UpdateGoal)
      return { success: true, data: goal }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update goal'
      }
    }
  }

  /**
   * Delete a goal
   */
  async deleteGoal(id: string, userId?: string): Promise<ServiceResult<void>> {
    try {
      if (!userId) {
        throw new Error('User ID is required')
      }
      await GoalsService.deleteGoal(id, userId)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete goal'
      }
    }
  }
}

// Export singleton instance
export const goalService = new GoalServiceAdapter()
