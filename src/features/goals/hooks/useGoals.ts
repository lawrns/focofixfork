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

  const createGoal = useCallback(async (userId: string, goalData: Parameters<typeof goalService.createGoal>[1]) => {
    try {
      const goal = await goalService.createGoal(userId, goalData)
      setGoals(prev => [goal, ...prev])
      return { success: true, data: goal }
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to create goal'
      setError(error)
      return { success: false, error }
    }
  }, [])

  const updateGoal = useCallback(async (userId: string, id: string, updates: Parameters<typeof goalService.updateGoal>[2]) => {
    try {
      const goal = await goalService.updateGoal(userId, id, updates)
      setGoals(prev => prev.map(g => g.id === id ? goal : g))
      return { success: true, data: goal }
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to update goal'
      setError(error)
      return { success: false, error }
    }
  }, [])

  const deleteGoal = useCallback(async (userId: string, id: string) => {
    try {
      await goalService.deleteGoal(id, userId)
      setGoals(prev => prev.filter(goal => goal.id !== id))
      return { success: true }
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

export function useGoal(id: string, userId: string) {
  const [goal, setGoal] = useState<Goal | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchGoal = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await goalService.getGoal(id, userId)
      setGoal(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch goal')
    } finally {
      setLoading(false)
    }
  }, [id, userId])

  useEffect(() => {
    if (id) {
      fetchGoal()
    }
  }, [id, fetchGoal])

  const updateGoal = useCallback(async (updates: Parameters<typeof goalService.updateGoal>[2]) => {
    try {
      const result = await goalService.updateGoal(userId, id, updates)
      setGoal(result)
      return { success: true, data: result }
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to update goal'
      setError(error)
      return { success: false, error }
    }
  }, [id, userId])

  return {
    goal,
    loading,
    error,
    refetch: fetchGoal,
    updateGoal
  }
}
