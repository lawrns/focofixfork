/**
 * Workspace Members Entity Model
 * Defines the structure and operations for workspace membership data
 */

export type MemberRole = 'owner' | 'admin' | 'member'

export interface WorkspaceMember {
  id: string
  workspace_id: string
  user_id: string
  role: MemberRole
  created_at: string
}

export interface WorkspaceMemberWithDetails extends WorkspaceMember {
  email?: string
  user_name?: string
}

export interface InviteMemberData {
  email: string
  role?: MemberRole
}

export interface UpdateMemberRoleData {
  role: MemberRole
}

export class WorkspaceMemberModel {
  /**
   * Validate member invitation data
   */
  static validateInvite(data: InviteMemberData): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!data.email || data.email.trim().length === 0) {
      errors.push('Email is required')
    }

    if (data.email && !this.isValidEmail(data.email)) {
      errors.push('Please enter a valid email address')
    }

    if (data.role && !['owner', 'admin', 'member'].includes(data.role)) {
      errors.push('Invalid role specified')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Validate role update data
   */
  static validateRoleUpdate(data: UpdateMemberRoleData): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!data.role || !['owner', 'admin', 'member'].includes(data.role)) {
      errors.push('Valid role is required')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Check if user can update member roles (admins can change anyone, members cannot change roles)
   */
  static canUpdateRole(currentUserRole: MemberRole, targetUserRole: MemberRole, isSelf: boolean): boolean {
    // Users cannot change their own role
    if (isSelf) {
      return false
    }

    switch (currentUserRole) {
      case 'owner':
        return true // Owners can change any role
      case 'admin':
        return true // Admins can change any role
      case 'member':
        return false // Members cannot change roles
      default:
        return false
    }
  }

  /**
   * Check if workspace can remove a member (cannot remove last admin)
   */
  static canRemoveMember(memberRole: MemberRole, totalAdmins: number): boolean {
    if (memberRole === 'admin' && totalAdmins <= 1) {
      return false // Cannot remove last admin
    }
    return true
  }

  /**
   * Transform raw database response to WorkspaceMember interface
   */
  static fromDatabase(data: any): WorkspaceMember {
    return {
      id: data.id,
      workspace_id: data.workspace_id,
      user_id: data.user_id,
      role: data.role,
      created_at: data.created_at
    }
  }

  /**
   * Transform WorkspaceMember interface to database format
   */
  static toDatabase(member: Partial<WorkspaceMember>): any {
    return {
      id: member.id,
      workspace_id: member.workspace_id,
      user_id: member.user_id,
      role: member.role,
      created_at: member.created_at
    }
  }

  /**
   * Transform with user details
   */
  static fromDatabaseWithDetails(data: any): WorkspaceMemberWithDetails {
    return {
      id: data.id,
      workspace_id: data.workspace_id,
      user_id: data.user_id,
      role: data.role,
      created_at: data.created_at,
      email: data.email,
      user_name: data.user_name
    }
  }

  /**
   * Simple email validation
   */
  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  /**
   * Get role hierarchy level (higher number = more permissions)
   */
  static getRoleLevel(role: MemberRole): number {
    switch (role) {
      case 'owner':
        return 3
      case 'admin':
        return 2
      case 'member':
        return 1
      default:
        return 0
    }
  }
}


