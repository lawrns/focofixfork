/**
 * Organization Members Entity Model
 * Defines the structure and operations for organization membership data
 */

export type MemberRole = 'director' | 'lead' | 'member'

export interface OrganizationMember {
  id: string
  organization_id: string
  user_id: string
  role: MemberRole
  created_at: string
}

export interface OrganizationMemberWithDetails extends OrganizationMember {
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

export class OrganizationMemberModel {
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

    if (data.role && !['director', 'lead', 'member'].includes(data.role)) {
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

    if (!data.role || !['director', 'lead', 'member'].includes(data.role)) {
      errors.push('Valid role is required')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Check if user can update member roles (directors can change anyone, leads can change members)
   */
  static canUpdateRole(currentUserRole: MemberRole, targetUserRole: MemberRole, isSelf: boolean): boolean {
    // Users cannot change their own role
    if (isSelf) {
      return false
    }

    switch (currentUserRole) {
      case 'director':
        return true // Directors can change any role
      case 'lead':
        return targetUserRole === 'member' // Leads can only change members
      case 'member':
        return false // Members cannot change roles
      default:
        return false
    }
  }

  /**
   * Check if organization can remove a member (cannot remove last director)
   */
  static canRemoveMember(memberRole: MemberRole, totalDirectors: number): boolean {
    if (memberRole === 'director' && totalDirectors <= 1) {
      return false // Cannot remove last director
    }
    return true
  }

  /**
   * Transform raw database response to OrganizationMember interface
   */
  static fromDatabase(data: any): OrganizationMember {
    return {
      id: data.id,
      organization_id: data.organization_id,
      user_id: data.user_id,
      role: data.role,
      created_at: data.created_at
    }
  }

  /**
   * Transform OrganizationMember interface to database format
   */
  static toDatabase(member: Partial<OrganizationMember>): any {
    return {
      id: member.id,
      organization_id: member.organization_id,
      user_id: member.user_id,
      role: member.role,
      created_at: member.created_at
    }
  }

  /**
   * Transform with user details
   */
  static fromDatabaseWithDetails(data: any): OrganizationMemberWithDetails {
    return {
      id: data.id,
      organization_id: data.organization_id,
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
      case 'director':
        return 3
      case 'lead':
        return 2
      case 'member':
        return 1
      default:
        return 0
    }
  }
}


