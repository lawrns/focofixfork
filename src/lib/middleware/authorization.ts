import { supabaseAdmin } from '@/lib/supabase-server'

// ✅ FIXED: Database alignment completed - all table and column names now match actual schema
// Tables: workspace_members, foco_projects, foco_project_members
// Columns: workspace_id (not organization_id), no is_active column

/**
 * Authorization middleware for role-based access control
 */

export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'guest'
export type ProjectRole = 'owner' | 'admin' | 'member' | 'guest'
export type Permission =
  | 'view'
  | 'edit'
  | 'delete'
  | 'manage_team'
  | 'manage_settings'
  | 'view_project'
  | 'update_project'
  | 'delete_project'
  | 'manage_milestones'
  | 'manage_tasks'

/**
 * Check if a user has a specific role in a workspace
 */
export async function checkWorkspaceRole(
  userId: string,
  workspaceId: string,
  requiredRoles: WorkspaceRole[]
): Promise<boolean> {
  try {
    const { data: member, error } = await supabaseAdmin
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .single()

    if (error || !member) {
      return false
    }

    return requiredRoles.includes(member.role as WorkspaceRole)
  } catch (error) {
    console.error('Check workspace role error:', error)
    return false
  }
}

/**
 * Check if a user is a member of a workspace
 */
export async function checkWorkspaceMembership(
  userId: string,
  workspaceId: string
): Promise<boolean> {
  try {
    const { data: member, error } = await supabaseAdmin
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .single()

    return !error && !!member
  } catch (error) {
    console.error('Check workspace membership error:', error)
    return false
  }
}

/**
 * Check if a user has a specific permission for a project
 */
export async function checkProjectPermission(
  userId: string,
  projectId: string,
  permission: Permission
): Promise<boolean> {
  try {
    // First check if user is the project creator
    const { data: project, error: projectError } = await supabaseAdmin
      .from('foco_projects')
      .select('owner_id, workspace_id')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return false
    }

    // Creator has all permissions
    if (project.owner_id === userId) {
      return true
    }

    // Check workspace membership and role
    const { data: workspaceMember } = await supabaseAdmin
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', project.workspace_id)
      .eq('user_id', userId)
      .single()

    // Workspace owners and admins have all project permissions
    if (workspaceMember && ['owner', 'admin'].includes(workspaceMember.role)) {
      return true
    }

    // Check project team assignment
    const { data: teamMember, error: teamError } = await supabaseAdmin
      .from('foco_project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .single()

    if (teamError || !teamMember) {
      return false
    }

    // Check role-based permissions
    const rolePermissions: Record<ProjectRole, Permission[]> = {
      owner: ['view', 'edit', 'delete', 'manage_team', 'manage_settings'],
      admin: ['view', 'edit', 'manage_team', 'manage_settings'],
      member: ['view', 'edit'],
      guest: ['view']
    }

    const allowedPermissions = rolePermissions[teamMember.role as ProjectRole] || []

    // Check if permission is in role permissions
    return allowedPermissions.includes(permission)
  } catch (error) {
    console.error('Check project permission error:', error)
    return false
  }
}

/**
 * Check if a user can manage workspace members (invite, remove, change roles)
 */
export async function canManageWorkspaceMembers(
  userId: string,
  workspaceId: string
): Promise<boolean> {
  return checkWorkspaceRole(userId, workspaceId, ['owner', 'admin'])
}

/**
 * Check if a user can manage workspace settings
 */
export async function canManageWorkspaceSettings(
  userId: string,
  workspaceId: string
): Promise<boolean> {
  return checkWorkspaceRole(userId, workspaceId, ['owner'])
}

/**
 * Check if a user can delete a workspace
 */
export async function canDeleteWorkspace(
  userId: string,
  workspaceId: string
): Promise<boolean> {
  return checkWorkspaceRole(userId, workspaceId, ['owner'])
}

/**
 * Get user's role in a workspace
 */
export async function getUserWorkspaceRole(
  userId: string,
  workspaceId: string
): Promise<WorkspaceRole | null> {
  try {
    const { data: member, error } = await supabaseAdmin
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .single()

    if (error || !member) {
      return null
    }

    return member.role as WorkspaceRole
  } catch (error) {
    console.error('Get user workspace role error:', error)
    return null
  }
}

/**
 * Get user's role in a project team
 */
export async function getUserProjectRole(
  userId: string,
  projectId: string
): Promise<ProjectRole | null> {
  try {
    // Check if user is project creator first
    const { data: project } = await supabaseAdmin
      .from('foco_projects')
      .select('owner_id')
      .eq('id', projectId)
      .single()

    if (project && project.owner_id === userId) {
      return 'owner'
    }

    // Check team assignment
    const { data: teamMember, error } = await supabaseAdmin
      .from('foco_project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .single()

    if (error || !teamMember) {
      return null
    }

    return teamMember.role as ProjectRole
  } catch (error) {
    console.error('Get user project role error:', error)
    return null
  }
}
