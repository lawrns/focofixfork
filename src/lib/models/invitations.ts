/**
 * Invitation Entity Model
 * Defines the structure and operations for organization invitations
 */

export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'cancelled'

export interface OrganizationInvitation {
  id: string
  organization_id: string
  email: string
  role: 'director' | 'lead' | 'member'
  invited_by: string
  status: InvitationStatus
  invited_at: string
  expires_at: string
  accepted_at?: string
  token: string
}

export interface CreateInvitationData {
  email: string
  role: 'owner' | 'admin' | 'member'
}

export interface InvitationWithDetails extends OrganizationInvitation {
  invited_by_name?: string
  organization_name?: string
}

export class InvitationModel {
  /**
   * Validate invitation creation data
   */
  static validateCreate(data: CreateInvitationData): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!data.email || data.email.trim().length === 0) {
      errors.push('Email is required')
    }

    if (data.email && !this.isValidEmail(data.email)) {
      errors.push('Please enter a valid email address')
    }

    if (!data.role || !['admin', 'member'].includes(data.role)) {
      errors.push('Valid role is required')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Check if invitation is expired
   */
  static isExpired(invitation: OrganizationInvitation): boolean {
    return new Date(invitation.expires_at) < new Date()
  }

  /**
   * Check if invitation can be accepted
   */
  static canAccept(invitation: OrganizationInvitation): boolean {
    return invitation.status === 'pending' && !this.isExpired(invitation)
  }

  /**
   * Generate invitation token
   */
  static generateToken(): string {
    return crypto.randomUUID()
  }

  /**
   * Calculate expiration date (7 days from now)
   */
  static getExpirationDate(): Date {
    const date = new Date()
    date.setDate(date.getDate() + 7)
    return date
  }

  /**
   * Transform raw database response to OrganizationInvitation interface
   */
  static fromDatabase(data: any): OrganizationInvitation {
    return {
      id: data.id,
      organization_id: data.organization_id,
      email: data.email,
      role: data.role,
      invited_by: data.invited_by,
      status: data.status,
      invited_at: data.invited_at,
      expires_at: data.expires_at,
      accepted_at: data.accepted_at,
      token: data.token
    }
  }

  /**
   * Transform with additional details
   */
  static fromDatabaseWithDetails(data: any): InvitationWithDetails {
    return {
      ...this.fromDatabase(data),
      invited_by_name: data.invited_by_name,
      organization_name: data.organization_name
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
   * Get status display info
   */
  static getStatusInfo(status: InvitationStatus): { label: string; color: string; icon: string } {
    switch (status) {
      case 'pending':
        return { label: 'Pending', color: 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/40', icon: '⏳' }
      case 'accepted':
        return { label: 'Accepted', color: 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/40', icon: '✅' }
      case 'expired':
        return { label: 'Expired', color: 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/40', icon: '⏰' }
      case 'cancelled':
        return { label: 'Cancelled', color: 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/40', icon: '❌' }
      default:
        return { label: status, color: 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/40', icon: '❓' }
    }
  }
}


