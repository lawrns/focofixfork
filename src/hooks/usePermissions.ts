import { useMemo } from 'react'
import { useAuth } from '@/lib/hooks/use-auth'
import { TeamMemberRole } from '@/lib/validation/schemas/team-member.schema'

interface PermissionCheck {
  canEdit: boolean
  canDelete: boolean
  canManageTeam: boolean
  canChangeSettings: boolean
  canCreate: boolean
  canView: boolean
  isOwner: boolean
  isAdmin: boolean
  isMember: boolean
  isGuest: boolean
  role: TeamMemberRole | null
}

interface UsePermissionsOptions {
  workspaceId?: string
  projectId?: string
  teamMembers?: Array<{
    user_id: string
    workspace_id: string
    project_id: string | null
    role: TeamMemberRole
  }>
  requireSpecificRole?: boolean
}

/**
 * Hook for checking user permissions in workspaces and projects
 * Permission hierarchy: owner > admin > member > guest
 */
export function usePermissions(options: UsePermissionsOptions = {}): PermissionCheck {
  const { user } = useAuth()
  const { workspaceId, projectId, teamMembers = [], requireSpecificRole = false } = options

  const permissions = useMemo(() => {
    const defaultPermissions: PermissionCheck = {
      canEdit: false,
      canDelete: false,
      canManageTeam: false,
      canChangeSettings: false,
      canCreate: false,
      canView: false,
      isOwner: false,
      isAdmin: false,
      isMember: false,
      isGuest: false,
      role: null,
    }

    if (!user) {
      return defaultPermissions
    }

    // If no workspace/project specified, assume basic permissions
    if (!workspaceId && !projectId) {
      return {
        ...defaultPermissions,
        canView: true,
        canCreate: true,
      }
    }

    // Find user's role in the relevant context
    let userRole: TeamMemberRole | null = null

    if (projectId) {
      // Check project-specific permissions first
      const projectRole = teamMembers.find(
        member => member.user_id === user.id &&
                 member.project_id === projectId
      )
      if (projectRole) {
        userRole = projectRole.role
      }
    }

    if (!userRole && workspaceId) {
      // Fall back to workspace-level permissions
      const wsRole = teamMembers.find(
        member => member.user_id === user.id &&
                 member.workspace_id === workspaceId &&
                 member.project_id === null // Workspace-level role
      )
      if (wsRole) {
        userRole = wsRole.role
      }
    }

    // If requireSpecificRole is true and no role found, deny all permissions
    if (requireSpecificRole && !userRole) {
      return defaultPermissions
    }

    // Calculate permissions based on role hierarchy
    const roleHierarchy: Record<string, number> = {
      owner: 4,
      admin: 3,
      member: 2,
      guest: 1,
    }

    const roleLevel = userRole ? roleHierarchy[userRole] : 0

    return {
      canEdit: roleLevel >= 2, // member and above
      canDelete: roleLevel >= 3, // admin and above
      canManageTeam: roleLevel >= 3, // admin and above
      canChangeSettings: roleLevel >= 3, // admin and above
      canCreate: roleLevel >= 2, // member and above
      canView: roleLevel >= 1, // guest and above
      isOwner: userRole === 'owner',
      isAdmin: userRole === 'admin',
      isMember: userRole === 'member',
      isGuest: userRole === 'guest',
      role: userRole,
    }
  }, [user, workspaceId, projectId, teamMembers, requireSpecificRole])

  return permissions
}

/**
 * Hook for checking bulk operation permissions
 */
export function useBulkPermissions(
  selectedProjects: Array<{ workspace_id: string }>,
  teamMembers: Array<{
    user_id: string
    workspace_id: string
    project_id: string | null
    role: TeamMemberRole
  }>
) {
  const { user } = useAuth()

  return useMemo(() => {
    if (!user || selectedProjects.length === 0) {
      return { canArchive: false, canDelete: false }
    }

    // Check if user has admin/owner permissions for all selected projects' workspaces
    const canArchive = selectedProjects.every(project => {
      const wsMembers = teamMembers.filter(
        member => member.workspace_id === project.workspace_id &&
                 member.user_id === user.id
      )

      // User must be admin or owner at workspace level
      return wsMembers.some(member =>
        member.role === 'admin' || member.role === 'owner'
      )
    })

    // Delete requires owner permissions
    const canDelete = selectedProjects.every(project => {
      const wsMembers = teamMembers.filter(
        member => member.workspace_id === project.workspace_id &&
                 member.user_id === user.id
      )

      return wsMembers.some(member => member.role === 'owner')
    })

    return { canArchive, canDelete }
  }, [user, selectedProjects, teamMembers])
}

/**
 * Hook for checking if user can manage a specific project
 */
export function useProjectPermissions(projectId: string, workspaceId: string) {
  const { user } = useAuth()

  // In a real app, this would fetch team members from Supabase
  // For now, we'll use mock permissions
  return useMemo(() => {
    if (!user) {
      return {
        canEdit: false,
        canDelete: false,
        canManageTeam: false,
        canView: true, // Allow viewing for unauthenticated users
      }
    }

    // Mock permissions - in real app this would check actual roles
    return {
      canEdit: true, // Assume user can edit for demo
      canDelete: true,
      canManageTeam: true,
      canView: true,
    }
  }, [user])
}
