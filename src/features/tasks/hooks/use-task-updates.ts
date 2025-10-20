'use client'

import { useState, useCallback } from 'react'
import { TaskUpdateService, TaskUpdateData } from '../services/task-update-service'
import { toast } from 'sonner'

export function useTaskUpdates() {
  const [isUpdating, setIsUpdating] = useState(false)

  const updateTask = useCallback(async (taskId: string, updates: TaskUpdateData) => {
    setIsUpdating(true)
    try {
      // Validate updates
      const validation = TaskUpdateService.validateTaskUpdate(updates)
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '))
      }

      const updatedTask = await TaskUpdateService.updateTask(taskId, updates)
      return updatedTask
    } catch (error: any) {
      console.error('Failed to update task:', error)
      toast.error(error.message || 'Failed to update task')
      throw error
    } finally {
      setIsUpdating(false)
    }
  }, [])

  const updateTaskStatus = useCallback(async (taskId: string, status: string) => {
    return updateTask(taskId, { status: status as any })
  }, [updateTask])

  const updateTaskPriority = useCallback(async (taskId: string, priority: string) => {
    return updateTask(taskId, { priority: priority as any })
  }, [updateTask])

  const updateTaskAssignee = useCallback(async (taskId: string, assigneeId: string | null) => {
    return updateTask(taskId, { assignee_id: assigneeId })
  }, [updateTask])

  const updateTaskDueDate = useCallback(async (taskId: string, dueDate: string | null) => {
    return updateTask(taskId, { due_date: dueDate })
  }, [updateTask])

  const updateTaskEstimatedHours = useCallback(async (taskId: string, hours: number | null) => {
    return updateTask(taskId, { estimated_hours: hours })
  }, [updateTask])

  const updateTaskActualHours = useCallback(async (taskId: string, hours: number | null) => {
    return updateTask(taskId, { actual_hours: hours })
  }, [updateTask])

  const updateTaskMilestone = useCallback(async (taskId: string, milestoneId: string | null) => {
    return updateTask(taskId, { milestone_id: milestoneId })
  }, [updateTask])

  const batchUpdateTasks = useCallback(async (updates: Array<{ taskId: string; updates: TaskUpdateData }>) => {
    setIsUpdating(true)
    try {
      const results = await TaskUpdateService.batchUpdateTasks(updates)
      return results
    } catch (error: any) {
      console.error('Failed to batch update tasks:', error)
      toast.error(error.message || 'Failed to update tasks')
      throw error
    } finally {
      setIsUpdating(false)
    }
  }, [])

  return {
    isUpdating,
    updateTask,
    updateTaskStatus,
    updateTaskPriority,
    updateTaskAssignee,
    updateTaskDueDate,
    updateTaskEstimatedHours,
    updateTaskActualHours,
    updateTaskMilestone,
    batchUpdateTasks,
  }
}

