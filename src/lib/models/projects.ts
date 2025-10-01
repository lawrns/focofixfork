/**
 * Projects Entity Model
 * Defines the structure and operations for project data
 */

export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled'

export interface Project {
  id: string
  name: string
  description: string | null
  organization_id: string
  status: ProjectStatus
  progress: number
  created_by: string
  created_at: string
  updated_at: string
}

export interface CreateProjectData {
  name: string
  description?: string
  organization_id: string
}

export interface UpdateProjectData {
  name?: string
  description?: string | null
  status?: ProjectStatus
  progress?: number
}

export class ProjectModel {
  /**
   * Validate project data before creation
   */
  static validateCreate(data: CreateProjectData): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!data.name || data.name.trim().length === 0) {
      errors.push('Project name is required')
    }

    if (data.name && data.name.trim().length < 2) {
      errors.push('Project name must be at least 2 characters long')
    }

    if (data.name && data.name.length > 200) {
      errors.push('Project name must be less than 200 characters')
    }

    if (!data.organization_id || data.organization_id.trim().length === 0) {
      errors.push('Organization ID is required')
    }

    if (data.description && data.description.length > 2000) {
      errors.push('Project description must be less than 2000 characters')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Validate project data before update
   */
  static validateUpdate(data: UpdateProjectData): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (data.name !== undefined) {
      if (data.name.trim().length === 0) {
        errors.push('Project name cannot be empty')
      }

      if (data.name.trim().length < 2) {
        errors.push('Project name must be at least 2 characters long')
      }

      if (data.name.length > 200) {
        errors.push('Project name must be less than 200 characters')
      }
    }

    if (data.progress !== undefined) {
      if (data.progress < 0 || data.progress > 100) {
        errors.push('Progress must be between 0 and 100')
      }
    }

    if (data.status && !['planning', 'active', 'on_hold', 'completed', 'cancelled'].includes(data.status)) {
      errors.push('Invalid project status')
    }

    if (data.description && data.description.length > 2000) {
      errors.push('Project description must be less than 2000 characters')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Validate status transitions
   */
  static validateStatusTransition(currentStatus: ProjectStatus, newStatus: ProjectStatus): { isValid: boolean; errors: string[] } {
    const errors: string[] = []
    const validTransitions: Record<ProjectStatus, ProjectStatus[]> = {
      planning: ['active', 'on_hold', 'completed', 'cancelled'],
      active: ['on_hold', 'completed', 'cancelled'],
      on_hold: ['active', 'completed', 'cancelled'],
      completed: ['cancelled'], // Can be cancelled after completion
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
   * Calculate progress based on milestones (helper method)
   */
  static calculateProgressFromMilestones(totalMilestones: number, completedMilestones: number): number {
    if (totalMilestones === 0) {
      return 0
    }
    return Math.round((completedMilestones / totalMilestones) * 100)
  }

  /**
   * Get status color for UI display
   */
  static getStatusColor(status: ProjectStatus): string {
    switch (status) {
      case 'planning':
        return '#6b7280' // gray
      case 'active':
        return '#059669' // green
      case 'on_hold':
        return '#d97706' // amber
      case 'completed':
        return '#2563eb' // blue
      case 'cancelled':
        return '#dc2626' // red
      default:
        return '#6b7280'
    }
  }

  /**
   * Get status display text
   */
  static getStatusText(status: ProjectStatus): string {
    switch (status) {
      case 'planning':
        return 'Planning'
      case 'active':
        return 'Active'
      case 'on_hold':
        return 'On Hold'
      case 'completed':
        return 'Completed'
      case 'cancelled':
        return 'Cancelled'
      default:
        return status
    }
  }

  /**
   * Transform raw database response to Project interface
   */
  static fromDatabase(data: any): Project {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      organization_id: data.organization_id,
      status: data.status,
      progress: data.progress || 0,
      created_by: data.created_by,
      created_at: data.created_at,
      updated_at: data.updated_at
    }
  }

  /**
   * Transform Project interface to database format
   */
  static toDatabase(project: Partial<Project>): any {
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      organization_id: project.organization_id,
      status: project.status,
      progress: project.progress,
      created_by: project.created_by,
      created_at: project.created_at,
      updated_at: project.updated_at
    }
  }
}


