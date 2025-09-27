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
  organizationId?: string
  projectId?: string
  teamMembers?: Array<{
    user_id: string
    organization_id: string
    project_id: string | null
    role: TeamMemberRole
  }>
  requireSpecificRole?: boolean
}

/**
 * Hook for checking user permissions in organizations and projects
 * Permission hierarchy: owner > admin > member > guest
 */
export function usePermissions(options: UsePermissionsOptions = {}): PermissionCheck {
  const { user } = useAuth()
  const { organizationId, projectId, teamMembers = [], requireSpecificRole = false } = options

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

    // If no organization/project specified, assume basic permissions
    if (!organizationId && !projectId) {
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

    if (!userRole && organizationId) {
      // Fall back to organization-level permissions
      const orgRole = teamMembers.find(
        member => member.user_id === user.id &&
                 member.organization_id === organizationId &&
                 member.project_id === null // Organization-level role
      )
      if (orgRole) {
        userRole = orgRole.role
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
  }, [user, organizationId, projectId, teamMembers, requireSpecificRole])

  return permissions
}

/**
 * Hook for checking bulk operation permissions
 */
export function useBulkPermissions(
  selectedProjects: Array<{ organization_id: string }>,
  teamMembers: Array<{
    user_id: string
    organization_id: string
    project_id: string | null
    role: TeamMemberRole
  }>
) {
  const { user } = useAuth()

  return useMemo(() => {
    if (!user || selectedProjects.length === 0) {
      return { canArchive: false, canDelete: false }
    }

    // Check if user has admin/owner permissions for all selected projects' organizations
    const canArchive = selectedProjects.every(project => {
      const orgMembers = teamMembers.filter(
        member => member.organization_id === project.organization_id &&
                 member.user_id === user.id
      )

      // User must be admin or owner at organization level
      return orgMembers.some(member =>
        member.role === 'admin' || member.role === 'owner'
      )
    })

    // Delete requires owner permissions
    const canDelete = selectedProjects.every(project => {
      const orgMembers = teamMembers.filter(
        member => member.organization_id === project.organization_id &&
                 member.user_id === user.id
      )

      return orgMembers.some(member => member.role === 'owner')
    })

    return { canArchive, canDelete }
  }, [user, selectedProjects, teamMembers])
}

/**
 * Hook for checking if user can manage a specific project
 */
export function useProjectPermissions(projectId: string, organizationId: string) {
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
  }, [user, projectId, organizationId])
}
