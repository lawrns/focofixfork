import { supabaseAdmin } from '../../../lib/supabase-server'

// ✅ FIXED(DB_ALIGNMENT): All table names and column mappings aligned with actual DB schema
// - 'projects' → 'foco_projects'
// - 'organization_members' → 'workspace_members'
// - 'organizations' → 'workspaces'
// - 'organization_id' → 'workspace_id'

type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled'

interface Project {
  id: string
  name: string
  description: string | null
  workspace_id: string | null
  status: ProjectStatus
  priority: 'low' | 'medium' | 'high' | 'urgent'
  created_by: string | null
  start_date: string | null
  due_date: string | null
  progress_percentage: number | null
  created_at: string | null
  updated_at: string | null
  workspaces?: {
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
      workspace_id?: string
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

      // Get user's workspace memberships first
      const { data: userWorkspaces, error: workspaceError } = await supabaseAdmin
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', userId)

      if (workspaceError) {
        console.error('Error fetching user workspaces:', workspaceError)
        return {
          success: false,
          error: 'Failed to fetch user workspaces'
        }
      }

      const userWorkspaceIds = userWorkspaces?.map(ws => ws.workspace_id) || []

      // Build query to get all projects user has access to:
      // 1. Projects they created
      // 2. Projects in workspaces they belong to
      // Simplified query without nested joins for better performance
      let query = supabaseAdmin
        .from('foco_projects')
        .select('*')

      // Apply access filters - user can see projects if:
      // - They created it, OR
      // - It belongs to a workspace they're a member of
      if (userWorkspaceIds.length > 0) {
        query = query.or(`created_by.eq.${userId},workspace_id.in.(${userWorkspaceIds.join(',')})`)
      } else {
        // If user has no workspace memberships, only show projects they created
        query = query.eq('created_by', userId)
      }

      // Apply filters
      if (options?.workspace_id) {
        query = query.eq('workspace_id', options.workspace_id)
      }

      if (options?.status && options.status !== 'all') {
        query = query.eq('status', options.status)
      }

      if (options?.priority && options.priority !== 'all') {
        query = query.eq('priority', options.priority)
      }

      // Sort by creation date (newest first)
      query = query.order('created_at', { ascending: false })

      // Apply pagination
      if (options?.limit) {
        query = query.limit(options.limit)
      }
      if (options?.offset !== undefined) {
        query = query.range(options.offset, (options.offset + (options.limit || 10)) - 1)
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
        data: data?.map(project => ({
          id: project.id,
          name: project.name,
          description: project.description,
          workspace_id: project.workspace_id,
          status: project.status as ProjectStatus,
          priority: project.priority as 'low' | 'medium' | 'high' | 'urgent',
          created_by: project.created_by,
          start_date: project.start_date,
          due_date: project.due_date,
          progress_percentage: project.progress_percentage,
          created_at: project.created_at,
          updated_at: project.updated_at
        })) || [],
        pagination: {
          total: count || data?.length || 0,
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

      // First check if user has access to this project
      // User can access if they created it, are in the workspace, or are a project member
      const { data: userWorkspaces } = await supabaseAdmin
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', userId)

      const workspaceIds = Array.isArray(userWorkspaces) ? userWorkspaces.map(ws => ws.workspace_id) : []

      // Build query with access control
      let query = supabaseAdmin
        .from('foco_projects')
        .select('*')
        .eq('id', projectId)

      // Add RLS-like filtering for access control
      if (workspaceIds.length > 0) {
        query = query.or(`created_by.eq.${userId},workspace_id.in.(${workspaceIds.join(',')})`)
      } else {
        query = query.eq('created_by', userId)
      }

      const { data, error } = await query.single()

      if (error) {
        console.error('Project fetch error:', error)
        if (error.code === 'PGRST116') {
          return {
            success: false,
            error: 'Project not found or access denied'
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
          description: data.description || null,
          workspace_id: data.workspace_id || null,
          created_by: data.created_by || '',
          start_date: data.start_date || null,
          due_date: data.due_date || null,
          status: data.status as ProjectStatus,
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
      console.log('ProjectsService.createProject: Starting creation for userId:', userId)
      console.log('ProjectsService.createProject: Project data:', projectData)

      if (!userId) {
        console.log('ProjectsService.createProject: No userId provided')
        return {
          success: false,
          error: 'User not authenticated'
        }
      }

      // Prepare the project data for insertion
      const dataToInsert = {
        name: projectData.name,
        description: projectData.description,
        workspace_id: projectData.workspace_id,
        status: projectData.status || 'planning',
        priority: projectData.priority || 'medium',
        start_date: projectData.start_date,
        due_date: projectData.due_date,
        progress_percentage: projectData.progress_percentage || 0,
        created_by: userId,
      }

      console.log('ProjectsService.createProject: Data to insert:', dataToInsert)

      const { data, error } = await supabaseAdmin
        .from('foco_projects')
        .insert(dataToInsert)
        .select()
        .single()

      console.log('ProjectsService.createProject: Database result:', { data, error })

      if (error) {
        console.error('Project creation error:', error)

        // Handle specific database constraint errors with user-friendly messages
        if (error.code === '23505') { // unique_violation
          return {
            success: false,
            error: 'A project with this name already exists. Please choose a different name.'
          }
        }

        if (error.code === '23503') { // foreign_key_violation
          return {
            success: false,
            error: 'Invalid workspace selected. Please check your workspace membership.'
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
          error: `Failed to create project: ${error.message}`
        }
      }

      console.log('ProjectsService.createProject: Project created successfully:', data.id)

      return {
        success: true,
        data: {
          id: data.id,
          name: data.name,
          description: data.description || null,
          workspace_id: data.workspace_id || null,
          status: data.status as ProjectStatus,
          priority: data.priority as 'low' | 'medium' | 'high' | 'urgent',
          created_by: data.created_by || '',
          start_date: data.start_date || null,
          due_date: data.due_date || null,
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
      console.log('ProjectsService.updateProject: Starting update for userId:', userId, 'projectId:', projectId)

      if (!userId) {
        console.log('ProjectsService.updateProject: No userId provided')
        return {
          success: false,
          error: 'User not authenticated'
        }
      }

      // Check if user can update this project (user must be creator)
      const { data: existingProject, error: fetchError } = await supabaseAdmin
        .from('foco_projects')
        .select('id, created_by, name, status, priority')
        .eq('id', projectId)
        .single()

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
        console.log('ProjectsService.updateProject: User is not creator')
        return {
          success: false,
          error: 'You can only update projects you created'
        }
      }

      console.log('ProjectsService.updateProject: Existing project:', {
        id: existingProject.id,
        name: existingProject.name,
        status: existingProject.status,
        priority: existingProject.priority
      })

      console.log('ProjectsService.updateProject: Permission check passed, proceeding with update')
      const { data, error } = await supabaseAdmin
        .from('foco_projects')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', projectId)
        .select('id, name, description, status, priority, workspace_id, created_by, start_date, due_date, progress_percentage, created_at, updated_at')
        .single()

      console.log('ProjectsService.updateProject: Database update result:', { success: !error, error: error?.message, data })

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
            error: 'Invalid workspace selected. Please check your workspace membership.'
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
          error: `Failed to update project: ${error.message}`
        }
      }

      console.log('ProjectsService.updateProject: Project updated successfully, result:', data)

      return {
        success: true,
        data: {
          id: data.id,
          name: data.name,
          description: data.description || null,
          workspace_id: data.workspace_id || null,
          status: data.status as ProjectStatus,
          priority: data.priority as 'low' | 'medium' | 'high' | 'urgent',
          created_by: data.created_by || '',
          start_date: data.start_date || null,
          due_date: data.due_date || null,
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

      // Check if user can delete this project (user must be creator)
      const { data: project, error: fetchError } = await supabaseAdmin
        .from('foco_projects')
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
          error: 'Failed to fetch project'
        }
      }

      // Simple check: user must be the creator
      if (project.created_by !== userId) {
        console.log('ProjectsService.deleteProject: User is not creator')
        return {
          success: false,
          error: 'You can only delete projects you created'
        }
      }

      console.log('ProjectsService.deleteProject: Permission check passed, proceeding with deletion')

      // Delete the project with explicit transaction handling
      console.log('ProjectsService.deleteProject: Executing delete query for projectId:', projectId)

           // First, check if project exists and belongs to user
           const { data: existingProject, error: checkError } = await supabaseAdmin
             .from('foco_projects')
             .select('id, created_by')
             .eq('id', projectId)
             .eq('created_by', userId)
             .single()

      if (checkError || !existingProject) {
        console.error('Project not found or access denied:', checkError)
        return {
          success: false,
          error: 'Project not found or access denied'
        }
      }

      // Execute delete
           const { error: projectError } = await supabaseAdmin
             .from('foco_projects')
             .delete()
             .eq('id', projectId)

      if (projectError) {
        console.error('Project deletion error:', projectError)
        return {
          success: false,
          error: `Failed to delete project: ${projectError.message}`
        }
      }

      console.log('ProjectsService.deleteProject: Delete query executed successfully')

      // Multiple verification attempts with delays
      for (let attempt = 1; attempt <= 3; attempt++) {
        console.log(`ProjectsService.deleteProject: Verification attempt ${attempt}`)

        // Wait a bit between attempts
        if (attempt > 1) {
          await new Promise(resolve => setTimeout(resolve, 200))
        }

             const { data: verifyData, error: verifyError } = await supabaseAdmin
               .from('foco_projects')
               .select('id')
               .eq('id', projectId)
               .single()

        if (verifyError && verifyError.code === 'PGRST116') {
          console.log(`ProjectsService.deleteProject: ✅ Verification successful on attempt ${attempt} - project not found`)
          return {
            success: true,
            data: null
          }
        } else if (verifyData) {
          console.log(`ProjectsService.deleteProject: ❌ Verification attempt ${attempt} failed - project still exists`)
          if (attempt === 3) {
            return {
              success: false,
              error: 'Project deletion verification failed after multiple attempts'
            }
          }
        } else {
          console.log(`ProjectsService.deleteProject: ⚠️ Unexpected verification result on attempt ${attempt}`)
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
      const { data: projects, error } = await supabaseAdmin
        .from('foco_projects')
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