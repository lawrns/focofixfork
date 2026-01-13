import { supabaseAdmin } from '@/lib/supabase-server'

// ✅ FIXED: Database alignment completed - all table and column names now match actual schema
// Tables: workspace_members, foco_projects, foco_project_members
// Columns: workspace_id (not organization_id), no is_active column

/**
 * Authorization middleware for role-based access control
 */

export type OrganizationRole = 'owner' | 'admin' | 'member' | 'guest'
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
 * Check if a user has a specific role in an organization
 */
export async function checkOrganizationRole(
  userId: string,
  organizationId: string,
  requiredRoles: OrganizationRole[]
): Promise<boolean> {
  try {
    const { data: member, error } = await supabaseAdmin
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', organizationId)
      .eq('user_id', userId)
      .single()

    if (error || !member) {
      return false
    }

    return requiredRoles.includes(member.role as OrganizationRole)
  } catch (error) {
    console.error('Check organization role error:', error)
    return false
  }
}

/**
 * Check if a user is a member of an organization
 */
export async function checkOrganizationMembership(
  userId: string,
  organizationId: string
): Promise<boolean> {
  try {
    const { data: member, error } = await supabaseAdmin
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', organizationId)
      .eq('user_id', userId)
      .single()

    return !error && !!member
  } catch (error) {
    console.error('Check organization membership error:', error)
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

    // Check organization membership and role
    const { data: orgMember } = await supabaseAdmin
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', project.workspace_id)
      .eq('user_id', userId)
      .single()

    // Organization owners and admins have all project permissions
    if (orgMember && ['owner', 'admin'].includes(orgMember.role)) {
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
 * Check if a user can manage organization members (invite, remove, change roles)
 */
export async function canManageOrganizationMembers(
  userId: string,
  organizationId: string
): Promise<boolean> {
  return checkOrganizationRole(userId, organizationId, ['owner', 'admin'])
}

/**
 * Check if a user can manage organization settings
 */
export async function canManageOrganizationSettings(
  userId: string,
  organizationId: string
): Promise<boolean> {
  return checkOrganizationRole(userId, organizationId, ['owner'])
}

/**
 * Check if a user can delete an organization
 */
export async function canDeleteOrganization(
  userId: string,
  organizationId: string
): Promise<boolean> {
  return checkOrganizationRole(userId, organizationId, ['owner'])
}

/**
 * Get user's role in an organization
 */
export async function getUserOrganizationRole(
  userId: string,
  organizationId: string
): Promise<OrganizationRole | null> {
  try {
    const { data: member, error } = await supabaseAdmin
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', organizationId)
      .eq('user_id', userId)
      .single()

    if (error || !member) {
      return null
    }

    return member.role as OrganizationRole
  } catch (error) {
    console.error('Get user organization role error:', error)
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
