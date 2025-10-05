import { useState } from 'react'
import { goalService } from '../services/goalService'

export function useGoalMutations() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateProgress = async (goalId: string, value: number, note?: string) => {
    try {
      setLoading(true)
      setError(null)
      const result = await goalService.updateGoalProgress(goalId, value, note)
      return result
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to update progress'
      setError(error)
      return { success: false, error }
    } finally {
      setLoading(false)
    }
  }

  const addComment = async (goalId: string, content: string, userId: string) => {
    try {
      setLoading(true)
      setError(null)
      const result = await goalService.addGoalComment(goalId, content, userId)
      return result
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to add comment'
      setError(error)
      return { success: false, error }
    } finally {
      setLoading(false)
    }
  }

  return {
    loading,
    error,
    updateProgress,
    addComment
  }
}
