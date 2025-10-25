/**
 * Client-side Project Service
 *
 * This service handles all project-related operations from the client-side,
 * making API calls instead of direct database access.
 *
 * This should be used in client-side code (components, hooks) instead of
 * the server-side ProjectsService which uses direct database access.
 */

import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-client'
import type { Project } from '../types'

export interface ProjectFilters {
  organization_id?: string
  status?: string
  priority?: string
  limit?: number
  offset?: number
}

export interface ProjectsListResponse {
  success: boolean
  data?: Project[]
  pagination?: {
    total: number
    limit: number
    offset: number
  }
  error?: string
}

export interface ProjectsResponse<T = Project> {
  success: boolean
  data?: T
  error?: string
}

export interface BulkOperationResult {
  successful: string[]
  failed: { id: string; error: string }[]
}

/**
 * Client-side Project Service
 * All methods make API calls to the server endpoints
 */
export class ProjectClientService {
  /**
   * Get projects for the authenticated user
   */
  static async getUserProjects(
    filters?: ProjectFilters
  ): Promise<ProjectsListResponse> {
    try {
      const params = new URLSearchParams()
      if (filters?.organization_id) params.set('organization_id', filters.organization_id)
      if (filters?.status) params.set('status', filters.status)
      if (filters?.priority) params.set('priority', filters.priority)
      if (filters?.limit) params.set('limit', filters.limit.toString())
      if (filters?.offset) params.set('offset', filters.offset.toString())

      const url = `/api/projects${params.toString() ? `?${params.toString()}` : ''}`
      const response = await apiGet(url)

      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Failed to fetch projects'
        }
      }

      return {
        success: true,
        data: response.data?.data || response.data,
        pagination: response.data?.pagination
      }
    } catch (error: any) {
      console.error('ProjectClientService.getUserProjects error:', error)
      return {
        success: false,
        error: error.message || 'Failed to fetch projects'
      }
    }
  }

  /**
   * Get a single project by ID
   */
  static async getProjectById(
    projectId: string
  ): Promise<ProjectsResponse<Project>> {
    try {
      const response = await apiGet(`/api/projects/${projectId}`)

      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Project not found'
        }
      }

      return {
        success: true,
        data: response.data?.data || response.data
      }
    } catch (error: any) {
      console.error('ProjectClientService.getProjectById error:', error)
      return {
        success: false,
        error: error.message || 'Failed to fetch project'
      }
    }
  }

  /**
   * Create a new project
   */
  static async createProject(
    projectData: {
      name: string
      description?: string
      organization_id?: string
      status?: string
      priority?: string
      start_date?: string
      due_date?: string
      progress_percentage?: number
    }
  ): Promise<ProjectsResponse<Project>> {
    try {
      const response = await apiPost('/api/projects', projectData)

      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Failed to create project'
        }
      }

      return {
        success: true,
        data: response.data?.data || response.data
      }
    } catch (error: any) {
      console.error('ProjectClientService.createProject error:', error)
      return {
        success: false,
        error: error.message || 'Failed to create project'
      }
    }
  }

  /**
   * Update an existing project
   */
  static async updateProject(
    projectId: string,
    updates: Partial<{
      name: string
      description: string
      organization_id: string
      status: string
      priority: string
      start_date: string
      due_date: string
      progress_percentage: number
    }>
  ): Promise<ProjectsResponse<Project>> {
    try {
      const response = await apiPut(`/api/projects/${projectId}`, updates)

      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Failed to update project'
        }
      }

      return {
        success: true,
        data: response.data?.data || response.data
      }
    } catch (error: any) {
      console.error('ProjectClientService.updateProject error:', error)
      return {
        success: false,
        error: error.message || 'Failed to update project'
      }
    }
  }

  /**
   * Delete a project
   */
  static async deleteProject(
    projectId: string
  ): Promise<ProjectsResponse<null>> {
    try {
      const response = await apiDelete(`/api/projects/${projectId}`)

      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Failed to delete project'
        }
      }

      return {
        success: true,
        data: null
      }
    } catch (error: any) {
      console.error('ProjectClientService.deleteProject error:', error)
      return {
        success: false,
        error: error.message || 'Failed to delete project'
      }
    }
  }

  /**
   * Perform bulk operations on projects
   */
  static async bulkOperation(
    operation: 'archive' | 'delete' | 'update_status',
    projectIds: string[],
    parameters?: {
      status?: string
      force?: boolean
    }
  ): Promise<{ success: boolean; data?: BulkOperationResult; error?: string }> {
    try {
      const response = await apiPost('/api/projects/bulk', {
        operation,
        project_ids: projectIds,
        parameters
      })

      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Bulk operation failed'
        }
      }

      return {
        success: true,
        data: response.data?.data || response.data
      }
    } catch (error: any) {
      console.error('ProjectClientService.bulkOperation error:', error)
      return {
        success: false,
        error: error.message || 'Bulk operation failed'
      }
    }
  }

  /**
   * Get project statistics for the current user
   */
  static async getProjectStats(): Promise<{
    success: boolean
    data?: {
      total: number
      active: number
      completed: number
      overdue: number
    }
    error?: string
  }> {
    try {
      const response = await apiGet('/api/projects/stats')

      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Failed to get project statistics'
        }
      }

      return {
        success: true,
        data: response.data?.data || response.data
      }
    } catch (error: any) {
      console.error('ProjectClientService.getProjectStats error:', error)
      return {
        success: false,
        error: error.message || 'Failed to get project statistics'
      }
    }
  }
}
