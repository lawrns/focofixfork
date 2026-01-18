/**
 * Workspaces Entity Model
 * Defines the structure and operations for workspace data
 */

export interface Workspace {
  id: string
  name: string
  description?: string | null
  website?: string | null
  owner_id: string
  created_at: string
  updated_at: string
}

export interface CreateWorkspaceData {
  name: string
  description?: string | null
  website?: string | null
  owner_id: string
}

export interface UpdateWorkspaceData {
  name?: string
}

export class WorkspaceModel {
  /**
   * Validate workspace data before creation
   */
  static validateCreate(data: CreateWorkspaceData): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!data.name || data.name.trim().length === 0) {
      errors.push('Workspace name is required')
    }

    if (data.name && data.name.trim().length < 2) {
      errors.push('Workspace name must be at least 2 characters long')
    }

    if (data.name && data.name.length > 100) {
      errors.push('Workspace name must be less than 100 characters')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Validate workspace data before update
   */
  static validateUpdate(data: UpdateWorkspaceData): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (data.name !== undefined) {
      if (data.name.trim().length === 0) {
        errors.push('Workspace name cannot be empty')
      }

      if (data.name.trim().length < 2) {
        errors.push('Workspace name must be at least 2 characters long')
      }

      if (data.name.length > 100) {
        errors.push('Workspace name must be less than 100 characters')
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Transform raw database response to Workspace interface
   */
  static fromDatabase(data: any): Workspace {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      website: data.website,
      owner_id: data.owner_id || data.created_by,
      created_at: data.created_at,
      updated_at: data.updated_at
    }
  }

  /**
   * Transform Workspace interface to database format
   */
  static toDatabase(workspace: Partial<Workspace>): any {
    return {
      id: workspace.id,
      name: workspace.name,
      description: workspace.description,
      website: workspace.website,
      owner_id: workspace.owner_id,
      created_at: workspace.created_at,
      updated_at: workspace.updated_at
    }
  }
}


