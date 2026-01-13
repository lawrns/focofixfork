import { useState, useEffect, useCallback } from 'react'
import { TasksService } from '../services/taskService'
import type { Task, CreateTaskData, UpdateTaskData, TaskFilters } from '../types'

export function useTasks(filters?: TaskFilters) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await TasksService.getUserTasks('current-user', filters)
      if (result.success && result.data) {
        setTasks(result.data as unknown as Task[])
      } else {
        setError(result.error || 'Failed to fetch tasks')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tasks')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  const createTask = useCallback(async (taskData: CreateTaskData) => {
    try {
      const result = await TasksService.createTask('current-user', taskData)
      if (result.success && result.data) {
        setTasks(prev => [result.data as unknown as Task, ...prev])
        return { success: true }
      }
      return { success: false, error: result.error }
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to create task'
      setError(error)
      return { success: false, error }
    }
  }, [])

  const updateTask = useCallback(async (id: string, updates: UpdateTaskData) => {
    try {
      const result = await TasksService.updateTask('current-user', id, updates)
      if (result.success && result.data) {
        setTasks(prev => prev.map(task => task.id === id ? result.data as unknown as Task : task))
        return { success: true }
      }
      return { success: false, error: result.error }
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to update task'
      setError(error)
      return { success: false, error }
    }
  }, [])

  const deleteTask = useCallback(async (id: string) => {
    try {
      const result = await TasksService.deleteTask('current-user', id)
      if (result.success) {
        setTasks(prev => prev.filter(task => task.id !== id))
        return { success: true }
      }
      return { success: false, error: result.error }
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to delete task'
      setError(error)
      return { success: false, error }
    }
  }, [])

  return {
    tasks,
    loading,
    error,
    refetch: fetchTasks,
    createTask,
    updateTask,
    deleteTask
  }
}

export function useTask(id: string) {
  const [task, setTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTask = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await TasksService.getTaskById('current-user', id)
      if (result.success && result.data) {
        setTask(result.data as unknown as Task)
      } else {
        setError(result.error || 'Task not found')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch task')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    if (id) {
      fetchTask()
    }
  }, [id, fetchTask])

  const updateTask = useCallback(async (updates: any) => {
    try {
      const result = await TasksService.updateTask('current-user', id, updates)
      if (result.success && result.data) {
        setTask(result.data as unknown as Task)
        return { success: true }
      }
      return { success: false, error: result.error }
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to update task'
      setError(error)
      return { success: false, error }
    }
  }, [id])

  return {
    task,
    loading,
    error,
    refetch: fetchTask,
    updateTask
  }
}
