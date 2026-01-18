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
  owner_id: string | null
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

      // Build query to get all projects user has access to
      let query = supabaseAdmin
        .from('foco_projects')
        .select('*', { count: 'exact' })

      // Apply access filters - user can see projects if:
      // - They created it (owner_id), OR
      // - It belongs to a workspace they're a member of
      if (userWorkspaceIds.length > 0) {
        query = query.or(`owner_id.eq.${userId},workspace_id.in.(${userWorkspaceIds.join(',')})`)
      } else {
        // If user has no workspace memberships, only show projects they created
        query = query.eq('owner_id', userId)
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
          owner_id: project.owner_id,
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
        query = query.or(`owner_id.eq.${userId},workspace_id.in.(${workspaceIds.join(',')})`)
      } else {
        query = query.eq('owner_id', userId)
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
          id: data.id,
          name: data.name,
          description: data.description || null,
          workspace_id: data.workspace_id || null,
          owner_id: data.owner_id,
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
      if (!userId) {
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
        owner_id: userId,
      }

      const { data, error } = await supabaseAdmin
        .from('foco_projects')
        .insert(dataToInsert)
        .select()
        .single()

      if (error) {
        console.error('Project creation error:', error)
        if (error.code === '23505') {
          return {
            success: false,
            error: 'A project with this name already exists. Please choose a different name.'
          }
        }
        return {
          success: false,
          error: `Failed to create project: ${error.message}`
        }
      }

      return {
        success: true,
        data: {
          ...data,
          status: data.status as ProjectStatus,
          priority: data.priority as 'low' | 'medium' | 'high' | 'urgent',
          owner_id: data.owner_id,
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

      // Check if user can update this project (user must be owner or admin)
      const { data: existingProject, error: fetchError } = await supabaseAdmin
        .from('foco_projects')
        .select('id, owner_id, workspace_id')
        .eq('id', projectId)
        .single()

      if (fetchError || !existingProject) {
        return {
          success: false,
          error: 'Project not found'
        }
      }

      // Check owner or workspace membership
      const { data: membership } = await supabaseAdmin
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', existingProject.workspace_id)
        .eq('user_id', userId)
        .single()

      const isOwner = existingProject.owner_id === userId
      const isAdmin = membership && (membership.role === 'owner' || membership.role === 'admin')

      if (!isOwner && !isAdmin) {
        return {
          success: false,
          error: 'You do not have permission to update this project'
        }
      }

      const { data, error } = await supabaseAdmin
        .from('foco_projects')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', projectId)
        .select()
        .single()

      if (error) {
        return {
          success: false,
          error: `Failed to update project: ${error.message}`
        }
      }

      return {
        success: true,
        data: {
          ...data,
          status: data.status as ProjectStatus,
          priority: data.priority as 'low' | 'medium' | 'high' | 'urgent',
          owner_id: data.owner_id,
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

      const { data: project, error: fetchError } = await supabaseAdmin
        .from('foco_projects')
        .select('owner_id, workspace_id')
        .eq('id', projectId)
        .single()

      if (fetchError || !project) {
        return {
          success: false,
          error: 'Project not found'
        }
      }

      // Only owner or workspace admin can delete
      const { data: membership } = await supabaseAdmin
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', project.workspace_id)
        .eq('user_id', userId)
        .single()

      const isOwner = project.owner_id === userId
      const isAdmin = membership && (membership.role === 'owner' || membership.role === 'admin')

      if (!isOwner && !isAdmin) {
        return {
          success: false,
          error: 'You do not have permission to delete this project'
        }
      }

      const { error: deleteError } = await supabaseAdmin
        .from('foco_projects')
        .delete()
        .eq('id', projectId)

      if (deleteError) {
        throw new Error(deleteError.message)
      }

      return {
        success: true,
        data: null
      }
    } catch (error: any) {
      console.error('Project deletion error:', error)
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

      const { data: projects, error } = await supabaseAdmin
        .from('foco_projects')
        .select('status, due_date')
        .eq('owner_id', userId)

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
