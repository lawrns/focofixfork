'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../hooks/use-auth'

// Types
export interface TaskTemplate {
  id: string
  user_id: string
  name: string
  title_template: string
  description_template?: string
  tags?: string[]
  priority: 'low' | 'medium' | 'high' | 'urgent'
  created_at: string
  updated_at: string
}

// Query keys
export const taskTemplateKeys = {
  all: ['task_templates'] as const,
  lists: () => [...taskTemplateKeys.all, 'list'] as const,
  detail: (id: string) => [...taskTemplateKeys.all, 'detail', id] as const,
}

// Hooks
export function useTaskTemplates() {
  const { user } = useAuth()

  return useQuery({
    queryKey: taskTemplateKeys.lists(),
    queryFn: async () => {
      if (!user) {
        throw new Error('User not authenticated')
      }

      const response = await fetch('/api/task-templates')
      if (!response.ok) {
        throw new Error('Failed to fetch task templates')
      }

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch task templates')
      }

      return data.data as TaskTemplate[]
    },
    enabled: !!user,
  })
}

export function useCreateTaskTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      name: string
      title_template: string
      description_template?: string
      tags?: string[]
      priority?: TaskTemplate['priority']
    }) => {
      const response = await fetch('/api/task-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Failed to create task template')
      }

      return result.data as TaskTemplate
    },
    onSuccess: () => {
      // Invalidate task templates list
      queryClient.invalidateQueries({ queryKey: taskTemplateKeys.lists() })
    },
  })
}

export function useDeleteTaskTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/task-templates/${id}`, {
        method: 'DELETE',
      })

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete task template')
      }

      return id
    },
    onSuccess: () => {
      // Invalidate task templates list
      queryClient.invalidateQueries({ queryKey: taskTemplateKeys.lists() })
    },
  })
}

export function useApplyTaskTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ templateId, projectId }: { templateId: string; projectId: string }) => {
      const response = await fetch(`/api/task-templates/${templateId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId }),
      })

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Failed to apply task template')
      }

      return result.data
    },
    onSuccess: (_, variables) => {
      // Invalidate tasks list for the project
      queryClient.invalidateQueries({
        queryKey: ['tasks', 'list', { project_id: variables.projectId }],
      })
    },
  })
}
