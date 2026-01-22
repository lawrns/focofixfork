'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../hooks/use-auth'

// Types
export interface Task {
  id: string
  workspace_id: string
  project_id: string
  parent_id?: string
  type: 'task' | 'bug' | 'feature' | 'milestone'
  title: string
  description?: string
  status: 'backlog' | 'next' | 'in_progress' | 'review' | 'blocked' | 'done'
  priority: 'urgent' | 'high' | 'medium' | 'low' | 'none'
  assignee_id?: string
  reporter_id: string
  due_date?: string
  start_date?: string
  completed_at?: string
  estimate_hours?: number
  actual_hours?: number
  position?: string
  section?: string
  blocked_reason?: string
  blocked_by_id?: string
  closure_note?: string
  created_at: string
  updated_at: string
  is_recurring?: boolean
  recurrence_pattern?: any
  parent_recurring_task_id?: string
  occurrence_number?: number
  next_occurrence_date?: string
}

// Query keys
export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...taskKeys.lists(), filters] as const,
  details: () => [...taskKeys.all, 'detail'] as const,
  detail: (id: string) => [...taskKeys.details(), id] as const,
}

// Hooks
export function useTasks(filters: Record<string, any> = {}) {
  const { user } = useAuth()

  return useQuery({
    queryKey: taskKeys.list(filters),
    queryFn: async () => {
      if (!user) {
        throw new Error('User not authenticated')
      }

      const params = new URLSearchParams()
      if (filters.project_id) params.append('project_id', filters.project_id)
      if (filters.status) params.append('status', filters.status)
      if (filters.assignee_id) params.append('assignee_id', filters.assignee_id)
      if (filters.limit) params.append('limit', String(filters.limit))
      if (filters.offset) params.append('offset', String(filters.offset))

      const response = await fetch(`/api/tasks?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch tasks')
      }

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch tasks')
      }

      return data.data as Task[]
    },
    enabled: !!user,
  })
}

export function useTask(id: string) {
  const { user } = useAuth()

  return useQuery({
    queryKey: taskKeys.detail(id),
    queryFn: async () => {
      if (!user) {
        throw new Error('User not authenticated')
      }

      const response = await fetch(`/api/tasks/${id}`)
      if (!response.ok) {
        throw new Error('Failed to fetch task')
      }

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch task')
      }

      return data.data as Task
    },
    enabled: !!user && !!id,
  })
}

export function useCreateTask() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (data: {
      title: string
      project_id: string
      workspace_id: string
      description?: string
      status?: Task['status']
      priority?: Task['priority']
      assignee_id?: string
      due_date?: string
      estimate_hours?: number
    }) => {
      if (!user) {
        throw new Error('User not authenticated')
      }

      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Failed to create task')
      }

      return result.data as Task
    },
    onSuccess: (newTask, variables) => {
      // Invalidate tasks list with same filters
      queryClient.invalidateQueries({
        queryKey: taskKeys.list({ project_id: variables.project_id }),
      })

      // Add new task to cache
      queryClient.setQueryData(taskKeys.detail(newTask.id), newTask)
    },
  })
}

export function useUpdateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Task> & { id: string }) => {
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Failed to update task')
      }

      return result.data as Task
    },
    onSuccess: (updatedTask) => {
      // Update specific task in cache
      queryClient.setQueryData(taskKeys.detail(updatedTask.id), updatedTask)

      // Invalidate all task lists as task could appear in any
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
    },
  })
}

export function useDeleteTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'DELETE',
      })

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete task')
      }

      return id
    },
    onSuccess: (deletedId) => {
      // Remove task from cache
      queryClient.removeQueries({ queryKey: taskKeys.detail(deletedId) })

      // Invalidate all task lists
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
    },
  })
}

export function useBatchUpdateTasks() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ taskIds, operation, value }: {
      taskIds: string[]
      operation: 'complete' | 'move' | 'priority' | 'assign' | 'tag' | 'delete'
      value?: any
    }) => {
      const response = await fetch('/api/tasks/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskIds, operation, value }),
      })

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Failed to perform batch operation')
      }

      return result.data
    },
    onSuccess: () => {
      // Invalidate all task lists on batch operations
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
    },
  })
}
