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

      // Get projects where user is a team member
      const teamQuery = supabase
        .from('project_team_assignments')
        .select(`
          projects (
            *,
            organizations (
              name
            )
          )
        `)
        .eq('user_id', userId)
        .eq('is_active', true)

      // Execute both queries in parallel
      const [createdResult, teamResult] = await Promise.all([
        createdQuery,
        teamQuery
      ])

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
   * Delete a project and all related data
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

      // Check if user has permission to delete this project
      const { data: project, error: fetchError } = await supabase
        .from('projects')
        .select('created_by')
        .eq('id', projectId)
        .single()

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
          error: 'Failed to verify project permissions'
        }
      }

      // Check if user is the creator or has admin/owner role in team
      let hasPermission = project.created_by === userId

      if (!hasPermission) {
        const { data: teamMember, error: teamError } = await supabase
          .from('project_team_assignments')
          .select('role')
          .eq('project_id', projectId)
          .eq('user_id', userId)
          .eq('is_active', true)
          .single()

        if (teamError && teamError.code !== 'PGRST116') {
          console.error('Team permission check error:', teamError)
          return {
            success: false,
            error: 'Failed to verify project permissions'
          }
        }

        hasPermission = teamMember && ['owner', 'admin'].includes(teamMember.role)
      }

      if (!hasPermission) {
        return {
          success: false,
          error: 'You do not have permission to delete this project'
        }
      }

      // Perform cascading deletion of all related data
      // Order matters due to foreign key constraints

      // 1. Delete time tracking entries
      const { error: timeTrackingError } = await supabase
        .from('time_tracking_entries')
        .delete()
        .eq('project_id', projectId)

      if (timeTrackingError) {
        console.error('Time tracking deletion error:', timeTrackingError)
        // Continue with other deletions, don't fail the whole operation
      }

      // 2. Delete project intelligence metrics
      const { error: metricsError } = await supabase
        .from('project_intelligence_metrics')
        .delete()
        .eq('project_id', projectId)

      if (metricsError) {
        console.error('Project intelligence metrics deletion error:', metricsError)
      }

      // 3. Delete milestone predictions
      const { error: predictionsError } = await supabase
        .from('milestone_predictions')
        .delete()
        .eq('project_id', projectId)

      if (predictionsError) {
        console.error('Milestone predictions deletion error:', predictionsError)
      }

      // 4. Delete files associated with project
      const { error: filesError } = await supabase
        .from('files')
        .delete()
        .eq('project_id', projectId)

      if (filesError) {
        console.error('Files deletion error:', filesError)
      }

      // 5. Delete automated workflow rules
      const { error: workflowError } = await supabase
        .from('automated_workflow_rules')
        .delete()
        .eq('project_id', projectId)

      if (workflowError) {
        console.error('Automated workflow rules deletion error:', workflowError)
      }

      // 6. Delete comments associated with project
      const { error: commentsError } = await supabase
        .from('comments')
        .delete()
        .eq('project_id', projectId)

      if (commentsError) {
        console.error('Comments deletion error:', commentsError)
      }

      // 7. Delete milestone user assignments (before milestones)
      const { error: milestoneUsersError } = await supabase
        .from('milestone_users')
        .delete()
        .eq('assigned_project_id', projectId)

      if (milestoneUsersError) {
        console.error('Milestone users deletion error:', milestoneUsersError)
      }

      // 8. Delete crico lists (before tasks since tasks reference lists)
      const { error: cricoListsError } = await supabase
        .from('crico_lists')
        .delete()
        .eq('project_id', projectId)

      if (cricoListsError) {
        console.error('Crico lists deletion error:', cricoListsError)
      }

      // 9. Delete tasks
      const { error: tasksError } = await supabase
        .from('tasks')
        .delete()
        .eq('project_id', projectId)

      if (tasksError) {
        console.error('Tasks deletion error:', tasksError)
        return {
          success: false,
          error: 'Failed to delete project tasks. Please try again.'
        }
      }

      // 10. Delete milestones
      const { error: milestonesError } = await supabase
        .from('milestones')
        .delete()
        .eq('project_id', projectId)

      if (milestonesError) {
        console.error('Milestones deletion error:', milestonesError)
        return {
          success: false,
          error: 'Failed to delete project milestones. Please try again.'
        }
      }

      // 11. Delete project team assignments
      const { error: teamError } = await supabase
        .from('project_team_assignments')
        .delete()
        .eq('project_id', projectId)

      if (teamError) {
        console.error('Project team assignments deletion error:', teamError)
        return {
          success: false,
          error: 'Failed to delete project team assignments. Please try again.'
        }
      }

      // 12. Finally, delete the project itself
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