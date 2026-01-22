'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../hooks/use-auth'

// Types
export interface Workspace {
  id: string
  name: string
  slug: string
  description?: string
  logo_url?: string
  is_active: boolean
  owner_id: string
  created_at: string
  updated_at: string
}

export interface WorkspaceMember {
  id: string
  workspace_id: string
  user_id: string
  role: 'owner' | 'admin' | 'member' | 'guest'
  joined_at: string
  user?: {
    id: string
    display_name?: string
    email: string
    avatar_url?: string
  }
}

// Query keys
export const workspaceKeys = {
  all: ['workspaces'] as const,
  lists: () => [...workspaceKeys.all, 'list'] as const,
  list: (filters: Record<string, any> = {}) => [...workspaceKeys.lists(), filters] as const,
  details: () => [...workspaceKeys.all, 'detail'] as const,
  detail: (id: string) => [...workspaceKeys.details(), id] as const,
  members: (id: string) => [...workspaceKeys.all, 'members', id] as const,
}

// Hooks
export function useWorkspaces(filters: Record<string, any> = {}) {
  const { user } = useAuth()

  return useQuery({
    queryKey: workspaceKeys.list(filters),
    queryFn: async () => {
      if (!user) {
        throw new Error('User not authenticated')
      }

      const params = new URLSearchParams()
      if (filters.is_active !== undefined) params.append('is_active', String(filters.is_active))
      if (filters.limit) params.append('limit', String(filters.limit))

      const response = await fetch(`/api/workspaces?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch workspaces')
      }

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch workspaces')
      }

      return data.data as Workspace[]
    },
    enabled: !!user,
  })
}

export function useWorkspace(id: string) {
  const { user } = useAuth()

  return useQuery({
    queryKey: workspaceKeys.detail(id),
    queryFn: async () => {
      if (!user) {
        throw new Error('User not authenticated')
      }

      const response = await fetch(`/api/workspaces/${id}`)
      if (!response.ok) {
        throw new Error('Failed to fetch workspace')
      }

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch workspace')
      }

      return data.data as Workspace
    },
    enabled: !!user && !!id,
  })
}

export function useWorkspaceMembers(workspaceId: string) {
  const { user } = useAuth()

  return useQuery({
    queryKey: workspaceKeys.members(workspaceId),
    queryFn: async () => {
      if (!user) {
        throw new Error('User not authenticated')
      }

      const response = await fetch(`/api/workspaces/${workspaceId}/members`)
      if (!response.ok) {
        throw new Error('Failed to fetch workspace members')
      }

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch workspace members')
      }

      return data.data as WorkspaceMember[]
    },
    enabled: !!user && !!workspaceId,
  })
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (data: {
      name: string
      description?: string
    }) => {
      if (!user) {
        throw new Error('User not authenticated')
      }

      const response = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Failed to create workspace')
      }

      return result.data as Workspace
    },
    onSuccess: (newWorkspace) => {
      // Invalidate workspaces list
      queryClient.invalidateQueries({ queryKey: workspaceKeys.lists() })

      // Add new workspace to cache
      queryClient.setQueryData(
        workspaceKeys.detail(newWorkspace.id),
        newWorkspace
      )
    },
  })
}

export function useUpdateWorkspace() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Workspace> & { id: string }) => {
      if (!user) {
        throw new Error('User not authenticated')
      }

      const response = await fetch(`/api/workspaces/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Failed to update workspace')
      }

      return result.data as Workspace
    },
    onSuccess: (updatedWorkspace) => {
      // Update workspace in cache
      queryClient.setQueryData(
        workspaceKeys.detail(updatedWorkspace.id),
        updatedWorkspace
      )

      // Invalidate workspaces list
      queryClient.invalidateQueries({ queryKey: workspaceKeys.lists() })
    },
  })
}

export function useUpdateWorkspaceMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      workspaceId,
      memberId,
      role
    }: {
      workspaceId: string
      memberId: string
      role: 'owner' | 'admin' | 'member' | 'guest'
    }) => {
      const response = await fetch(
        `/api/workspaces/${workspaceId}/members/${memberId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role }),
        }
      )

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Failed to update member role')
      }

      return result.data
    },
    onSuccess: (_, variables) => {
      // Invalidate members list for this workspace
      queryClient.invalidateQueries({
        queryKey: workspaceKeys.members(variables.workspaceId),
      })
    },
  })
}
