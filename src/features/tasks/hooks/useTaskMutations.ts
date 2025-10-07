import { useState } from 'react'
import { TasksService } from '../services/taskService'

export function useTaskMutations() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateStatus = async (taskId: string, status: 'todo' | 'in_progress' | 'review' | 'done') => {
    try {
      setLoading(true)
      setError(null)
      const result = await TasksService.updateTask('current-user', taskId, { status })
      return result
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to update status'
      setError(error)
      return { success: false, error }
    } finally {
      setLoading(false)
    }
  }

  const assignTask = async (taskId: string, assigneeId: string) => {
    try {
      setLoading(true)
      setError(null)
      const result = await TasksService.updateTask('current-user', taskId, { assignee_id: assigneeId })
      return result
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to assign task'
      setError(error)
      return { success: false, error }
    } finally {
      setLoading(false)
    }
  }

  const updatePriority = async (taskId: string, priority: 'low' | 'medium' | 'high' | 'urgent') => {
    try {
      setLoading(true)
      setError(null)
      const result = await TasksService.updateTask('current-user', taskId, { priority })
      return result
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to update priority'
      setError(error)
      return { success: false, error }
    } finally {
      setLoading(false)
    }
  }

  const setDueDate = async (taskId: string, dueDate: string) => {
    try {
      setLoading(true)
      setError(null)
      const result = await TasksService.updateTask('current-user', taskId, { due_date: dueDate })
      return result
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to set due date'
      setError(error)
      return { success: false, error }
    } finally {
      setLoading(false)
    }
  }

  return {
    loading,
    error,
    updateStatus,
    assignTask,
    updatePriority,
    setDueDate
  }
}
