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
      console.log('ProjectsService.getUserProjects: Starting with userId:', userId)
      if (!userId) {
        console.log('ProjectsService.getUserProjects: No userId provided')
        return {
          success: false,
          error: 'User not authenticated'
        }
      }

      console.log('ProjectsService.getUserProjects: Building queries for userId:', userId)

      // Get projects created by user
      const createdQuery = supabase
        .from('projects')
        .select(`
          *,
          organizations (
            name
          )
        `)
        .eq('created_by', userId)

      console.log('ProjectsService.getUserProjects: Created query built')

      // Get projects where user is a team member
      const teamQuery = supabase
        .from('project_team_assignments')
        .select(`
          projects!inner (
            *,
            organizations (
              name
            )
          )
        `)
        .eq('user_id', userId)
        .eq('is_active', true)

      console.log('ProjectsService.getUserProjects: Team query built')

      // Execute both queries in parallel
      console.log('ProjectsService.getUserProjects: Executing queries...')
      const [createdResult, teamResult] = await Promise.all([
        createdQuery,
        teamQuery
      ])

      console.log('ProjectsService.getUserProjects: Query results received')
      console.log('ProjectsService.getUserProjects: createdResult:', { error: createdResult.error, dataCount: createdResult.data?.length })
      console.log('ProjectsService.getUserProjects: teamResult:', { error: teamResult.error, dataCount: teamResult.data?.length })

      if (createdResult.error) {
        console.error('Projects created by user fetch error:', createdResult.error)
        return {
          success: false,
          error: createdResult.error.message
        }
      }

      if (teamResult.error) {
        console.error('Projects via team assignments fetch error:', teamResult.error)
        return {
          success: false,
          error: teamResult.error.message
        }
      }

      // Combine and deduplicate projects
      const projectsMap = new Map<string, any>()

      // Add projects created by user
      if (createdResult.data) {
        createdResult.data.forEach(project => {
          projectsMap.set(project.id, project)
        })
      }

      // Add projects from team assignments
      if (teamResult.data) {
        teamResult.data.forEach(item => {
          if (item.projects) {
            projectsMap.set(item.projects.id, item.projects)
          }
        })
      }

      let projects = Array.from(projectsMap.values())

      // Apply filters
      if (options?.organization_id) {
        projects = projects.filter(p => p.organization_id === options.organization_id)
      }

      if (options?.status && options.status !== 'all') {
        projects = projects.filter(p => p.status === options.status)
      }

      if (options?.priority && options.priority !== 'all') {
        projects = projects.filter(p => p.priority === options.priority)
      }

      // Sort by creation date (newest first)
      projects.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      // Apply pagination
      const total = projects.length
      if (options?.offset !== undefined) {
        const limit = options.limit || 10
        const start = options.offset
        const end = start + limit
        projects = projects.slice(start, end)
      }

      return {
        success: true,
        data: projects.map(project => ({
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
          updated_at: project.updated_at || '',
          organizations: project.organizations ? { name: project.organizations.name } : undefined
        })),
        pagination: {
          total: total,
          limit: options?.limit || 10,
          offset: options?.offset || 0
        }
      }
    } catch (error: any) {
      console.error('Projects service error:', error)
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
        created_by: userId,
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

      // Add creator as team member with owner role
      const { error: teamError } = await supabase
        .from('project_team_assignments')
        .insert({
          project_id: data.id,
          user_id: userId,
          role: 'owner',
          assigned_by: userId,
          is_active: true,
        })

      if (teamError) {
        console.error('Failed to add creator to project team:', teamError)
        // Don't fail the whole operation, but log the error
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
      console.log('ProjectsService.updateProject: Starting update for userId:', userId, 'projectId:', projectId, 'updates:', updates)
      console.log('ProjectsService.updateProject: Field types:', {
        name: typeof updates.name,
        description: typeof updates.description,
        status: typeof updates.status,
        priority: typeof updates.priority,
        start_date: typeof updates.start_date,
        due_date: typeof updates.due_date,
        progress_percentage: typeof updates.progress_percentage
      })
      if (!userId) {
        console.log('ProjectsService.updateProject: No userId provided')
        return {
          success: false,
          error: 'User not authenticated'
        }
      }

      // First check if user can update this project
      const { data: existingProject, error: fetchError } = await supabase
        .from('projects')
        .select('created_by')
        .eq('id', projectId)
        .single()

      console.log('ProjectsService.updateProject: Fetch existing project result:', { existingProject, fetchError })

      if (fetchError) {
        console.error('Project fetch error during update:', fetchError)
        if (fetchError.code === 'PGRST116') {
          return {
            success: false,
            error: 'Project not found'
          }
        }
        return {
          success: false,
          error: 'Failed to fetch project for update'
        }
      }

      // Simple check: user must be the creator
      if (existingProject.created_by !== userId) {
        console.log('ProjectsService.updateProject: User is not creator. Project created_by:', existingProject.created_by, 'userId:', userId)
        return {
          success: false,
          error: 'You can only update projects you created'
        }
      }

      console.log('ProjectsService.updateProject: Permission check passed, proceeding with update')
      const { data, error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', projectId)
        .select()
        .single()

      console.log('ProjectsService.updateProject: Database update result:', { data, error })

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
   * Delete a project and all related data
   */
  static async deleteProject(
    userId: string,
    projectId: string
  ): Promise<ProjectsResponse<null>> {
    try {
      console.log('ProjectsService.deleteProject: Starting deletion for userId:', userId, 'projectId:', projectId)
      if (!userId) {
        console.log('ProjectsService.deleteProject: No userId provided')
        return {
          success: false,
          error: 'User not authenticated'
        }
      }

      // Simplified: Just check if user is the creator (since RLS is disabled, app controls security)
      const { data: project, error: fetchError } = await supabase
        .from('projects')
        .select('created_by')
        .eq('id', projectId)
        .single()

      console.log('ProjectsService.deleteProject: Fetch result:', { project, fetchError })

      if (fetchError) {
        console.error('Project fetch error:', fetchError)
        if (fetchError.code === 'PGRST116') {
          return {
            success: false,
            error: 'Project not found'
          }
        }
        return {
          success: false,
          error: 'Failed to fetch project'
        }
      }

      // Simple check: user must be the creator
      if (project.created_by !== userId) {
        console.log('ProjectsService.deleteProject: User is not creator. Project created_by:', project.created_by, 'userId:', userId)
        return {
          success: false,
          error: 'You can only delete projects you created'
        }
      }

      console.log('ProjectsService.deleteProject: Permission check passed, proceeding with deletion')

      // Simplified deletion - just delete team assignments and project
      // Most related tables don't exist yet, so we skip the complex cascading deletes

      console.log('ProjectsService.deleteProject: Deleting team assignments first')
      const { error: teamError } = await supabase
        .from('project_team_assignments')
        .delete()
        .eq('project_id', projectId)

      if (teamError) {
        console.error('Project team assignments deletion error:', teamError)
        // Don't fail the whole operation for team assignment deletion
      }

      console.log('ProjectsService.deleteProject: Deleting project')
      // Finally, delete the project itself
      const { error: projectError } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId)

      if (projectError) {
        console.error('Project deletion error:', projectError)
        return {
          success: false,
          error: 'Failed to delete project. Please try again.'
        }
      }

      console.log('ProjectsService.deleteProject: Project deleted successfully')

      // Verify the project was actually deleted
      const { data: verifyData, error: verifyError } = await supabase
        .from('projects')
        .select('id')
        .eq('id', projectId)
        .single()

      console.log('ProjectsService.deleteProject: Verification - project still exists?', { verifyData, verifyError })

      if (verifyError?.code === 'PGRST116') {
        console.log('ProjectsService.deleteProject: ✅ Project successfully deleted from database')
      } else {
        console.log('ProjectsService.deleteProject: ❌ Project still exists in database!')
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