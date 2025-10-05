import { useState, useEffect, useCallback } from 'react'
import { goalService } from '../services/goalService'
import type { Goal, GoalFilters } from '../types'

export function useGoals(filters?: GoalFilters) {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchGoals = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await goalService.getGoals(
        filters?.organizationId,
        filters?.projectId,
        filters?.userId
      )
      setGoals(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch goals')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchGoals()
  }, [fetchGoals])

  const createGoal = useCallback(async (goalData: Parameters<typeof goalService.createGoal>[0]) => {
    try {
      const result = await goalService.createGoal(goalData)
      if (result.success && result.data) {
        setGoals(prev => [result.data!, ...prev])
        return { success: true }
      }
      return { success: false, error: result.error }
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to create goal'
      setError(error)
      return { success: false, error }
    }
  }, [])

  const updateGoal = useCallback(async (id: string, updates: Parameters<typeof goalService.updateGoal>[1]) => {
    try {
      const result = await goalService.updateGoal(id, updates)
      if (result.success && result.data) {
        setGoals(prev => prev.map(goal => goal.id === id ? result.data! : goal))
        return { success: true }
      }
      return { success: false, error: result.error }
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to update goal'
      setError(error)
      return { success: false, error }
    }
  }, [])

  const deleteGoal = useCallback(async (id: string) => {
    try {
      const result = await goalService.deleteGoal(id)
      if (result.success) {
        setGoals(prev => prev.filter(goal => goal.id !== id))
        return { success: true }
      }
      return { success: false, error: result.error }
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to delete goal'
      setError(error)
      return { success: false, error }
    }
  }, [])

  return {
    goals,
    loading,
    error,
    refetch: fetchGoals,
    createGoal,
    updateGoal,
    deleteGoal
  }
}

export function useGoal(id: string) {
  const [goal, setGoal] = useState<Goal | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchGoal = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await goalService.getGoalById(id)
      setGoal(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch goal')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    if (id) {
      fetchGoal()
    }
  }, [id, fetchGoal])

  const updateGoal = useCallback(async (updates: Parameters<typeof goalService.updateGoal>[1]) => {
    try {
      const result = await goalService.updateGoal(id, updates)
      if (result.success && result.data) {
        setGoal(result.data)
        return { success: true }
      }
      return { success: false, error: result.error }
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to update goal'
      setError(error)
      return { success: false, error }
    }
  }, [id])

  return {
    goal,
    loading,
    error,
    refetch: fetchGoal,
    updateGoal
  }
}
