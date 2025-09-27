/**
 * Milestone Comments Entity Model
 * Defines the structure and operations for milestone comment data
 */

export interface MilestoneComment {
  id: string
  milestone_id: string
  user_id: string
  content: string
  created_at: string
}

export interface MilestoneCommentWithDetails extends MilestoneComment {
  user_name?: string
  user_email?: string
}

export interface CreateCommentData {
  milestone_id: string
  content: string
}

export class MilestoneCommentModel {
  /**
   * Validate comment data before creation
   */
  static validateCreate(data: CreateCommentData): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!data.content || data.content.trim().length === 0) {
      errors.push('Comment content is required')
    }

    if (data.content && data.content.trim().length < 2) {
      errors.push('Comment must be at least 2 characters long')
    }

    if (data.content && data.content.length > 2000) {
      errors.push('Comment must be less than 2000 characters')
    }

    if (!data.milestone_id || data.milestone_id.trim().length === 0) {
      errors.push('Milestone ID is required')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Check if user can delete a comment (only comment author can delete)
   */
  static canDeleteComment(commentUserId: string, currentUserId: string): boolean {
    return commentUserId === currentUserId
  }

  /**
   * Check if user can create comments on milestone (must have access to milestone's project)
   */
  static canCreateComment(userId: string, milestoneProjectMembers: string[]): boolean {
    return milestoneProjectMembers.includes(userId)
  }

  /**
   * Sanitize comment content (basic XSS prevention)
   */
  static sanitizeContent(content: string): string {
    return content
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
  }

  /**
   * Format comment for display (convert line breaks, etc.)
   */
  static formatForDisplay(content: string): string {
    return content
      .replace(/\n/g, '<br>')
      .replace(/\s{2,}/g, (match) => '&nbsp;'.repeat(match.length))
  }

  /**
   * Get comment age in human-readable format
   */
  static getAge(createdAt: string): string {
    const now = new Date()
    const created = new Date(createdAt)
    const diffMs = now.getTime() - created.getTime()

    const diffSeconds = Math.floor(diffMs / 1000)
    const diffMinutes = Math.floor(diffSeconds / 60)
    const diffHours = Math.floor(diffMinutes / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffSeconds < 60) {
      return 'just now'
    } else if (diffMinutes < 60) {
      return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    } else {
      return created.toLocaleDateString()
    }
  }

  /**
   * Transform raw database response to MilestoneComment interface
   */
  static fromDatabase(data: any): MilestoneComment {
    return {
      id: data.id,
      milestone_id: data.milestone_id,
      user_id: data.user_id,
      content: data.content,
      created_at: data.created_at
    }
  }

  /**
   * Transform MilestoneComment interface to database format
   */
  static toDatabase(comment: Partial<MilestoneComment>): any {
    return {
      id: comment.id,
      milestone_id: comment.milestone_id,
      user_id: comment.user_id,
      content: comment.content,
      created_at: comment.created_at
    }
  }

  /**
   * Transform with user details
   */
  static fromDatabaseWithDetails(data: any): MilestoneCommentWithDetails {
    return {
      id: data.id,
      milestone_id: data.milestone_id,
      user_id: data.user_id,
      content: data.content,
      created_at: data.created_at,
      user_name: data.user_name,
      user_email: data.user_email
    }
  }
}


