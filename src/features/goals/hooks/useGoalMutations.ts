import { useState } from 'react'
import { goalService } from '../services/goalService'
import type { CreateGoal, UpdateGoal } from '@/lib/validation/schemas/goals'

export function useGoalMutations() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createGoal = async (goalData: CreateGoal & { userId: string }) => {
    try {
      setLoading(true)
      setError(null)
      const { userId, ...data } = goalData
      const result = await goalService.createGoal(userId, data)
      return result
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Failed to create goal'
      setError(errMsg)
      return { success: false, error: errMsg }
    } finally {
      setLoading(false)
    }
  }

  const updateGoal = async (goalId: string, updates: UpdateGoal & { userId: string }) => {
    try {
      setLoading(true)
      setError(null)
      const { userId, ...data } = updates
      const result = await goalService.updateGoal(userId, goalId, data)
      return result
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Failed to update goal'
      setError(errMsg)
      return { success: false, error: errMsg }
    } finally {
      setLoading(false)
    }
  }

  const deleteGoal = async (goalId: string, userId: string) => {
    try {
      setLoading(true)
      setError(null)
      const result = await goalService.deleteGoal(goalId, userId)
      return result
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Failed to delete goal'
      setError(errMsg)
      return { success: false, error: errMsg }
    } finally {
      setLoading(false)
    }
  }

  return {
    loading,
    error,
    createGoal,
    updateGoal,
    deleteGoal
  }
}
