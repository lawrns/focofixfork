/**
 * Organizations Entity Model
 * Defines the structure and operations for organization data
 */

export interface Organization {
  id: string
  name: string
  description?: string | null
  website?: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface CreateOrganizationData {
  name: string
  description?: string | null
  website?: string | null
}

export interface UpdateOrganizationData {
  name?: string
}

export class OrganizationModel {
  /**
   * Validate organization data before creation
   */
  static validateCreate(data: CreateOrganizationData): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!data.name || data.name.trim().length === 0) {
      errors.push('Organization name is required')
    }

    if (data.name && data.name.trim().length < 2) {
      errors.push('Organization name must be at least 2 characters long')
    }

    if (data.name && data.name.length > 100) {
      errors.push('Organization name must be less than 100 characters')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Validate organization data before update
   */
  static validateUpdate(data: UpdateOrganizationData): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (data.name !== undefined) {
      if (data.name.trim().length === 0) {
        errors.push('Organization name cannot be empty')
      }

      if (data.name.trim().length < 2) {
        errors.push('Organization name must be at least 2 characters long')
      }

      if (data.name.length > 100) {
        errors.push('Organization name must be less than 100 characters')
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Transform raw database response to Organization interface
   */
  static fromDatabase(data: any): Organization {
    return {
      id: data.id,
      name: data.name,
      created_by: data.created_by,
      created_at: data.created_at,
      updated_at: data.updated_at
    }
  }

  /**
   * Transform Organization interface to database format
   */
  static toDatabase(organization: Partial<Organization>): any {
    return {
      id: organization.id,
      name: organization.name,
      description: organization.description,
      website: organization.website,
      created_by: organization.created_by,
      created_at: organization.created_at,
      updated_at: organization.updated_at
    }
  }
}


