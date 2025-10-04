import { supabase } from '@/lib/supabase-client'
import { supabaseAdmin } from '@/lib/supabase-server'

import { ProjectStatus } from '@/lib/models/projects'

interface Project {
  id: string
  name: string
  description: string | null
  organization_id: string | null
  status: ProjectStatus
  priority: 'low' | 'medium' | 'high' | 'urgent'
  created_by: string | null
  start_date: string | null
  due_date: string | null
  progress_percentage: number | null
  created_at: string | null
  updated_at: string | null
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

      console.log('ProjectsService.getUserProjects: Building comprehensive query for userId:', userId)

      // Get user's organization memberships first
      const { data: userOrgs, error: orgError } = await supabaseAdmin
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', userId)

      if (orgError) {
        console.error('Error fetching user organizations:', orgError)
        return {
          success: false,
          error: 'Failed to fetch user organizations'
        }
      }

      const userOrgIds = userOrgs?.map(org => org.organization_id) || []
      console.log('ProjectsService.getUserProjects: User belongs to organizations:', userOrgIds)

      // Build query to get all projects user has access to:
      // 1. Projects they created
      // 2. Projects in organizations they belong to
      // 3. Projects they're assigned to via project_team_assignments
      let query = supabaseAdmin
        .from('projects')
        .select(`
          *,
          organizations (
            name
          )
        `)

      // Apply access filters - user can see projects if:
      // - They created it, OR
      // - It belongs to an organization they're a member of
      if (userOrgIds.length > 0) {
        query = query.or(`created_by.eq.${userId},organization_id.in.(${userOrgIds.join(',')})`)
      } else {
        // If user has no organization memberships, only show projects they created
        query = query.eq('created_by', userId)
      }

      // Apply filters
      if (options?.organization_id) {
        query = query.eq('organization_id', options.organization_id)
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

      console.log('ProjectsService.getUserProjects: Executing query...')
      const { data, error, count } = await query

      console.log('ProjectsService.getUserProjects: Query result:', { error: error?.message, dataCount: data?.length, count })

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
          organization_id: project.organization_id,
          status: project.status as ProjectStatus,
          priority: project.priority as 'low' | 'medium' | 'high' | 'urgent',
          created_by: project.created_by,
          start_date: project.start_date,
          due_date: project.due_date,
          progress_percentage: project.progress_percentage,
          created_at: project.created_at,
          updated_at: project.updated_at,
          organizations: project.organizations ? { name: project.organizations.name } : undefined
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
          description: data.description || null,
          organization_id: data.organization_id || null,
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
        organization_id: projectData.organization_id,
        status: projectData.status || 'planning',
        priority: projectData.priority || 'medium',
        start_date: projectData.start_date,
        due_date: projectData.due_date,
        progress_percentage: projectData.progress_percentage || 0,
        created_by: userId,
      }

      console.log('ProjectsService.createProject: Data to insert:', dataToInsert)

      const { data, error } = await supabaseAdmin
        .from('projects')
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
          organization_id: data.organization_id || null,
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
        .from('projects')
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
        .from('projects')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', projectId)
        .select('id, name, description, status, priority, organization_id, created_by, start_date, due_date, progress_percentage, created_at, updated_at')
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
          organization_id: data.organization_id || null,
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
             .from('projects')
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
             .from('projects')
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
               .from('projects')
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