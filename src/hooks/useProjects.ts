import { useState, useEffect, useCallback } from 'react'
import { projectStore } from '@/lib/stores/project-store'

interface UseProjectsOptions {
  workspaceId?: string
  status?: string
  priority?: string
  limit?: number
  refreshOnMount?: boolean
}

interface Project {
  id: string
  name: string
  description: string | null
  status: string
  priority: string
  workspace_id: string | null
  owner_id: string
  created_at: string
  updated_at: string
  color?: string
  is_active?: boolean
  start_date?: string | null
  due_date?: string | null
  progress_percentage?: number
  workspaces?: {
    name: string
  }
}

// Consistent data fetching hook for projects with caching and real-time updates
export function useProjects(options?: UseProjectsOptions) {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProjects = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Build query parameters
      const params = new URLSearchParams()
      if (options?.workspaceId) params.append('workspace_id', options.workspaceId)
      if (options?.status) params.append('status', options.status)
      if (options?.priority) params.append('priority', options.priority)
      if (options?.limit) params.append('limit', options.limit?.toString() || '50')

      const { apiClient } = await import('@/lib/api-client')
      const data = await apiClient.get(`/api/projects?${params}`)
      
      if (data.success) {
        const projectData = data.data?.data || data.data || []
        setProjects(projectData)
        // Update the global store for consistency across components
        projectStore.setProjects(projectData)
        return projectData
      } else {
        throw new Error(data.error || 'Failed to fetch projects')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load projects'
      setError(errorMessage)
      console.error('useProjects error:', err)
      return []
    } finally {
      setLoading(false)
    }
  }, [options])

  // Subscribe to store changes for real-time updates
  useEffect(() => {
    const unsubscribe = projectStore.subscribe((storeProjects) => {
      // Only update if we don't have local loading state (to prevent UI flicker)
      if (!loading) {
        setProjects(storeProjects)
      }
    })

    return unsubscribe
  }, [loading])

  // Initial fetch
  useEffect(() => {
    if (options?.refreshOnMount !== false) {
      fetchProjects()
    } else {
      // If not refreshing on mount, get current data from store
      const currentProjects = projectStore.getProjects()
      if (currentProjects.length > 0) {
        setProjects(currentProjects)
        setLoading(false)
      } else {
        fetchProjects()
      }
    }
  }, [fetchProjects, options?.refreshOnMount])

  return {
    projects,
    loading,
    error,
    refetch: fetchProjects,
  }
}
