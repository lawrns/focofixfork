/**
 * Milestones Entity Model
 * Defines the structure and operations for milestone data
 */

export type MilestoneStatus = 'planning' | 'in-progress' | 'review' | 'completed' | 'cancelled'
export type MilestonePriority = 'low' | 'medium' | 'high' | 'critical'

export interface Milestone {
  id: string
  project_id: string
  name: string
  description: string | null
  status: MilestoneStatus
  priority: MilestonePriority
  deadline: string | null
  assigned_to: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface CreateMilestoneData {
  project_id: string
  name: string
  description?: string | null
  priority?: MilestonePriority
  deadline?: string | null
  assigned_to?: string | null
}

export interface UpdateMilestoneData {
  name?: string
  description?: string | null
  status?: MilestoneStatus
  priority?: MilestonePriority
  deadline?: string | null
  assigned_to?: string | null
}

export class MilestoneModel {
  /**
   * Validate milestone data before creation
   */
  static validateCreate(data: CreateMilestoneData): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!data.name || data.name.trim().length === 0) {
      errors.push('Milestone name is required')
    }

    if (data.name && data.name.trim().length < 2) {
      errors.push('Milestone name must be at least 2 characters long')
    }

    if (data.name && data.name.length > 200) {
      errors.push('Milestone name must be less than 200 characters')
    }

    if (!data.project_id || data.project_id.trim().length === 0) {
      errors.push('Project ID is required')
    }

    if (data.description && data.description.length > 2000) {
      errors.push('Milestone description must be less than 2000 characters')
    }

    if (data.priority && !['low', 'medium', 'high', 'critical'].includes(data.priority)) {
      errors.push('Invalid priority level')
    }

    if (data.deadline) {
      const deadlineDate = new Date(data.deadline)
      if (isNaN(deadlineDate.getTime())) {
        errors.push('Invalid deadline date format')
      } else if (deadlineDate < new Date()) {
        errors.push('Deadline cannot be in the past')
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Validate milestone data before update
   */
  static validateUpdate(data: UpdateMilestoneData): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (data.name !== undefined) {
      if (data.name.trim().length === 0) {
        errors.push('Milestone name cannot be empty')
      }

      if (data.name.trim().length < 2) {
        errors.push('Milestone name must be at least 2 characters long')
      }

      if (data.name.length > 200) {
        errors.push('Milestone name must be less than 200 characters')
      }
    }

    if (data.description && data.description.length > 2000) {
      errors.push('Milestone description must be less than 2000 characters')
    }

    if (data.priority && !['low', 'medium', 'high', 'critical'].includes(data.priority)) {
      errors.push('Invalid priority level')
    }

    if (data.status && !['planning', 'in-progress', 'review', 'completed', 'cancelled'].includes(data.status)) {
      errors.push('Invalid status')
    }

    if (data.deadline) {
      const deadlineDate = new Date(data.deadline)
      if (isNaN(deadlineDate.getTime())) {
        errors.push('Invalid deadline date format')
      } else if (deadlineDate < new Date()) {
        errors.push('Deadline cannot be in the past')
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Validate status transitions
   */
  static validateStatusTransition(currentStatus: MilestoneStatus, newStatus: MilestoneStatus): { isValid: boolean; errors: string[] } {
    const errors: string[] = []
    const validTransitions: Record<MilestoneStatus, MilestoneStatus[]> = {
      planning: ['in-progress', 'cancelled'],
      'in-progress': ['review', 'planning', 'cancelled'],
      review: ['completed', 'in-progress', 'planning'],
      completed: [], // Terminal state
      cancelled: [] // Terminal state
    }

    if (!validTransitions[currentStatus].includes(newStatus)) {
      errors.push(`Cannot transition from ${currentStatus} to ${newStatus}`)
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Get priority level for sorting and display
   */
  static getPriorityLevel(priority: MilestonePriority): number {
    switch (priority) {
      case 'low':
        return 1
      case 'medium':
        return 2
      case 'high':
        return 3
      case 'critical':
        return 4
      default:
        return 0
    }
  }

  /**
   * Get priority color for UI display
   */
  static getPriorityColor(priority: MilestonePriority): string {
    switch (priority) {
      case 'low':
        return '#10b981' // green
      case 'medium':
        return '#3b82f6' // blue
      case 'high':
        return '#f59e0b' // amber
      case 'critical':
        return '#ef4444' // red
      default:
        return '#6b7280'
    }
  }

  /**
   * Get status color for UI display
   */
  static getStatusColor(status: MilestoneStatus): string {
    switch (status) {
      case 'planning':
        return '#6b7280' // gray
      case 'in-progress':
        return '#3b82f6' // blue
      case 'review':
        return '#f59e0b' // amber
      case 'completed':
        return '#10b981' // green
      case 'cancelled':
        return '#ef4444' // red
      default:
        return '#6b7280'
    }
  }

  /**
   * Get status display text
   */
  static getStatusText(status: MilestoneStatus): string {
    switch (status) {
      case 'planning':
        return 'Planning'
      case 'in-progress':
        return 'In Progress'
      case 'review':
        return 'Review'
      case 'completed':
        return 'Completed'
      case 'cancelled':
        return 'Cancelled'
      default:
        return status
    }
  }

  /**
   * Get priority display text
   */
  static getPriorityText(priority: MilestonePriority): string {
    switch (priority) {
      case 'low':
        return 'Low'
      case 'medium':
        return 'Medium'
      case 'high':
        return 'High'
      case 'critical':
        return 'Critical'
      default:
        return priority
    }
  }

  /**
   * Check if milestone is overdue
   */
  static isOverdue(milestone: Milestone): boolean {
    if (!milestone.deadline || milestone.status === 'completed' || milestone.status === 'cancelled') {
      return false
    }

    const deadline = new Date(milestone.deadline)
    const now = new Date()
    return deadline < now
  }

  /**
   * Check if milestone is due soon (within 7 days)
   */
  static isDueSoon(milestone: Milestone): boolean {
    if (!milestone.deadline || milestone.status === 'completed' || milestone.status === 'cancelled') {
      return false
    }

    const deadline = new Date(milestone.deadline)
    const now = new Date()
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    return deadline >= now && deadline <= sevenDaysFromNow
  }

  /**
   * Transform raw database response to Milestone interface
   */
  static fromDatabase(data: any): Milestone {
    return {
      id: data.id,
      project_id: data.project_id,
      name: data.name,
      description: data.description,
      status: data.status,
      priority: data.priority,
      deadline: data.deadline,
      assigned_to: data.assigned_to,
      created_by: data.created_by,
      created_at: data.created_at,
      updated_at: data.updated_at
    }
  }

  /**
   * Transform Milestone interface to database format
   */
  static toDatabase(milestone: Partial<Milestone>): any {
    return {
      id: milestone.id,
      project_id: milestone.project_id,
      name: milestone.name,
      description: milestone.description,
      status: milestone.status,
      priority: milestone.priority,
      deadline: milestone.deadline,
      assigned_to: milestone.assigned_to,
      created_by: milestone.created_by,
      created_at: milestone.created_at,
      updated_at: milestone.updated_at
    }
  }
}


