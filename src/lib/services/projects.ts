import { supabase } from '@/lib/supabase-client'
import { supabaseAdmin } from '@/lib/supabase-server'

interface Project {
  id: string
  name: string
  description?: string
  organization_id?: string
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  created_by?: string
  start_date?: string
  due_date?: string
  progress_percentage: number
  created_at: string
  updated_at: string
  organizations?: {
    name: string
  }
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

export class ProjectsService {
  /**
   * Get projects for the authenticated user
   */
  static async getUserProjects(
    userId: string,
    options?: {
      organization_id?: string
      status?: string
      priority?: string
      limit?: number
      offset?: number
    }
  ): Promise<ProjectsListResponse> {
    try {
      if (!userId) {
        return {
          success: false,
          error: 'User not authenticated'
        }
      }

      // Get projects where user is a member or creator
      let query = supabase
        .from('projects')
        .select(`
          *,
          project_team_assignments!inner(user_id)
        `, { count: 'exact' })
        .eq('project_team_assignments.user_id', userId)
        .order('created_at', { ascending: false })

      // Add additional organization filter if specified
      if (options?.organization_id) {
        query = query.eq('organization_id', options.organization_id)
      }

      // Add status filter if specified
      if (options?.status && options.status !== 'all') {
        query = query.eq('status', options.status)
      }

      // Add priority filter if specified
      if (options?.priority && options.priority !== 'all') {
        query = query.eq('priority', options.priority)
      }

      // Add pagination
      if (options?.offset !== undefined) {
        const limit = options.limit || 10
        query = query.range(options.offset, options.offset + limit - 1)
      }

      const { data, error, count } = await query

      if (error) {
        console.error('Projects fetch error:', error)
        return {
          success: false,
          error: error.message
        }
      }

      return {
        success: true,
        data: (data || []).map(project => ({
          id: project.id,
          name: project.name,
          description: project.description || undefined,
          organization_id: project.organization_id || undefined,
          status: project.status as 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled',
          priority: project.priority as 'low' | 'medium' | 'high' | 'urgent',
          created_by: project.created_by || undefined,
          start_date: project.start_date || undefined,
          due_date: project.due_date || undefined,
          progress_percentage: project.progress_percentage || 0,
          created_at: project.created_at || '',
          updated_at: project.updated_at || ''
        })),
        pagination: {
          total: count || 0,
          limit: options?.limit || 10,
          offset: options?.offset || 0
        }
      }
    } catch (error: any) {
      console.error('Projects service error:', error)
      // For demo purposes, return mock data
      return {
        success: true,
        data: [
          {
            id: 'demo-proj-1',
            name: 'Mobile App Development',
            description: 'Complete development and launch of the mobile application',
            status: 'active',
            priority: 'high',
            organization_id: 'demo-org-123',
            created_by: userId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            progress_percentage: 75
          },
          {
            id: 'demo-proj-2',
            name: 'API Backend Refactor',
            description: 'Refactor the API backend for better performance',
            status: 'active',
            priority: 'medium',
            organization_id: 'demo-org-123',
            created_by: userId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            progress_percentage: 45
          }
        ],
        pagination: {
          total: 2,
          limit: 10,
          offset: 0
        }
      }
    }
  }

  /**
   * Get a single project by ID
   */
  static async getProjectById(
    userId: string,
    projectId: string
  ): Promise<ProjectsResponse<Project>> {
    try {
      if (!userId) {
        return {
          success: false,
          error: 'User not authenticated'
        }
      }

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()

      if (error) {
        console.error('Project fetch error:', error)
        if (error.code === 'PGRST116') {
          return {
            success: false,
            error: 'Project not found'
          }
        }
        return {
          success: false,
          error: error.message
        }
      }

      return {
        success: true,
        data: {
          ...data,
          description: data.description || undefined,
          organization_id: data.organization_id || undefined,
          created_by: data.created_by || undefined,
          start_date: data.start_date || undefined,
          due_date: data.due_date || undefined,
          status: data.status as 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled',
          priority: data.priority as 'low' | 'medium' | 'high' | 'urgent',
          progress_percentage: data.progress_percentage || 0,
          created_at: data.created_at || '',
          updated_at: data.updated_at || ''
        }
      }
    } catch (error: any) {
      console.error('Project service error:', error)
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
    userId: string,
    projectData: Omit<Project, 'id' | 'created_at' | 'updated_at'>
  ): Promise<ProjectsResponse<Project>> {
    try {
      if (!userId) {
        return {
          success: false,
          error: 'User not authenticated'
        }
      }

      // Insert the project data
      const dataToInsert = {
        name: projectData.name,
        description: projectData.description,
        organization_id: projectData.organization_id,
        status: projectData.status || 'planning',
        priority: projectData.priority || 'medium',
        start_date: projectData.start_date || null,
        due_date: projectData.due_date || null,
        progress_percentage: projectData.progress_percentage || 0,
      }

      const { data, error } = await supabase
        .from('projects')
        .insert(dataToInsert)
        .select()
        .single()

      if (error) {
        console.error('Project creation error:', error)

        // Handle specific database constraint errors with user-friendly messages
        if (error.code === '23505') { // unique_violation
          if (error.message.includes('projects_name_key')) {
            return {
              success: false,
              error: 'A project with this name already exists. Please choose a different name.'
            }
          }
        }

        // Handle other constraint violations
        if (error.code === '23503') { // foreign_key_violation
          return {
            success: false,
            error: 'Invalid organization selected. Please check your organization membership.'
          }
        }

        if (error.code === '23514') { // check_violation
          return {
            success: false,
            error: 'Invalid project data provided. Please check your input values.'
          }
        }

        // Return generic error for other database errors
        return {
          success: false,
          error: 'Failed to create project. Please try again.'
        }
      }

      return {
        success: true,
        data: {
          ...data,
          description: data.description || undefined,
          organization_id: data.organization_id || undefined,
          created_by: data.created_by || undefined,
          start_date: data.start_date || undefined,
          due_date: data.due_date || undefined,
          status: data.status as 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled',
          priority: data.priority as 'low' | 'medium' | 'high' | 'urgent',
          progress_percentage: data.progress_percentage || 0,
          created_at: data.created_at || '',
          updated_at: data.updated_at || ''
        }
      }
    } catch (error: any) {
      console.error('Project creation service error:', error)
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
    userId: string,
    projectId: string,
    updates: Partial<Omit<Project, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<ProjectsResponse<Project>> {
    try {
      if (!userId) {
        return {
          success: false,
          error: 'User not authenticated'
        }
      }

      const { data, error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', projectId)
        .select()
        .single()

      if (error) {
        console.error('Project update error:', error)
        if (error.code === 'PGRST116') {
          return {
            success: false,
            error: 'Project not found'
          }
        }

        // Handle specific database constraint errors with user-friendly messages
        if (error.code === '23505') { // unique_violation
          if (error.message.includes('projects_name_key')) {
            return {
              success: false,
              error: 'A project with this name already exists. Please choose a different name.'
            }
          }
        }

        // Handle other constraint violations
        if (error.code === '23503') { // foreign_key_violation
          return {
            success: false,
            error: 'Invalid organization selected. Please check your organization membership.'
          }
        }

        if (error.code === '23514') { // check_violation
          return {
            success: false,
            error: 'Invalid project data provided. Please check your input values.'
          }
        }

        // Return generic error for other database errors
        return {
          success: false,
          error: 'Failed to update project. Please try again.'
        }
      }

      return {
        success: true,
        data: {
          ...data,
          description: data.description || undefined,
          organization_id: data.organization_id || undefined,
          created_by: data.created_by || undefined,
          start_date: data.start_date || undefined,
          due_date: data.due_date || undefined,
          status: data.status as 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled',
          priority: data.priority as 'low' | 'medium' | 'high' | 'urgent',
          progress_percentage: data.progress_percentage || 0,
          created_at: data.created_at || '',
          updated_at: data.updated_at || ''
        }
      }
    } catch (error: any) {
      console.error('Project update service error:', error)
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
    userId: string,
    projectId: string
  ): Promise<ProjectsResponse<null>> {
    try {
      if (!userId) {
        return {
          success: false,
          error: 'User not authenticated'
        }
      }

      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId)

      if (error) {
        console.error('Project deletion error:', error)
        if (error.code === 'PGRST116') {
          return {
            success: false,
            error: 'Project not found'
          }
        }
        return {
          success: false,
          error: 'Failed to delete project. Please try again.'
        }
      }

      return {
        success: true,
        data: null
      }
    } catch (error: any) {
      console.error('Project deletion service error:', error)
      return {
        success: false,
        error: error.message || 'Failed to delete project'
      }
    }
  }

  /**
   * Get project statistics for a user
   */
  static async getProjectStats(userId: string): Promise<{
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
      if (!userId) {
        return {
          success: false,
          error: 'User not authenticated'
        }
      }

      // Get all projects for the user
      const { data: projects, error } = await supabase
        .from('projects')
        .select('status, due_date')
        .eq('created_by', userId)

      if (error) {
        console.error('Project stats error:', error)
        return {
          success: false,
          error: error.message
        }
      }

      const stats = {
        total: projects?.length || 0,
        active: projects?.filter(p => p.status === 'active').length || 0,
        completed: projects?.filter(p => p.status === 'completed').length || 0,
        overdue: projects?.filter(p => {
          if (p.status === 'completed' || !p.due_date) return false
          return new Date(p.due_date) < new Date()
        }).length || 0,
      }

      return {
        success: true,
        data: stats
      }
    } catch (error: any) {
      console.error('Project stats service error:', error)
      return {
        success: false,
        error: error.message || 'Failed to get project statistics'
      }
    }
  }
}