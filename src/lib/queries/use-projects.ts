'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../hooks/use-auth'

// Types
export interface Project {
  id: string
  workspace_id: string
  name: string
  slug: string
  description?: string
  color?: string
  icon?: string
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled'
  owner_id: string
  is_pinned?: boolean
  archived_at?: string
  created_at: string
  updated_at: string
}

// Query keys
export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...projectKeys.lists(), filters] as const,
  details: () => [...projectKeys.all, 'detail'] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
}

// Hooks
export function useProjects(filters: Record<string, any> = {}) {
  const { user } = useAuth()

  return useQuery({
    queryKey: projectKeys.list(filters),
    queryFn: async () => {
      if (!user) {
        throw new Error('User not authenticated')
      }

      const params = new URLSearchParams()
      if (filters.workspace_id) params.append('workspace_id', filters.workspace_id)
      if (filters.status) params.append('status', filters.status)
      if (filters.archived !== undefined) params.append('archived', String(filters.archived))
      if (filters.limit) params.append('limit', String(filters.limit))
      if (filters.offset) params.append('offset', String(filters.offset))

      const response = await fetch(`/api/projects?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch projects')
      }

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch projects')
      }

      return data.data as Project[]
    },
    enabled: !!user,
  })
}

export function useProject(id: string) {
  const { user } = useAuth()

  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: async () => {
      if (!user) {
        throw new Error('User not authenticated')
      }

      const response = await fetch(`/api/projects?id=${id}`)
      if (!response.ok) {
        throw new Error('Failed to fetch project')
      }

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch project')
      }

      return data.data as Project
    },
    enabled: !!user && !!id,
  })
}

export function useCreateProject() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (data: {
      name: string
      workspace_id: string
      description?: string
      color?: string
      icon?: string
      status?: Project['status']
    }) => {
      if (!user) {
        throw new Error('User not authenticated')
      }

      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Failed to create project')
      }

      return result.data as Project
    },
    onSuccess: (newProject) => {
      // Invalidate and refetch projects list
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() })

      // Add new project to cache directly
      queryClient.setQueryData(
        projectKeys.detail(newProject.id),
        newProject
      )
    },
  })
}

export function useUpdateProject() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Project> & { id: string }) => {
      if (!user) {
        throw new Error('User not authenticated')
      }

      const response = await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Failed to update project')
      }

      return result.data as Project
    },
    onSuccess: (updatedProject) => {
      // Update specific project in cache
      queryClient.setQueryData(
        projectKeys.detail(updatedProject.id),
        updatedProject
      )

      // Invalidate projects list
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() })
    },
  })
}

export function useDeleteProject() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) {
        throw new Error('User not authenticated')
      }

      const response = await fetch(`/api/projects/${id}`, {
        method: 'DELETE',
      })

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete project')
      }

      return id
    },
    onSuccess: (deletedId) => {
      // Remove project from cache
      queryClient.removeQueries({ queryKey: projectKeys.detail(deletedId) })

      // Invalidate projects list
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() })
    },
  })
}
