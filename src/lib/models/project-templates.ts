/**
 * Project Templates Entity Model
 * Defines the structure and operations for project templates
 */

export type FieldType = 'text' | 'number' | 'date' | 'checkbox' | 'select'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface DefaultTask {
  title: string
  description?: string
  priority: TaskPriority
}

export interface CustomField {
  name: string
  type: FieldType
  required?: boolean
  defaultValue?: string | number | boolean
  options?: string[] // For select type
}

export interface TemplateStructure {
  defaultTasks: DefaultTask[]
  customFields: CustomField[]
}

export interface ProjectTemplate {
  id: string
  user_id: string
  workspace_id: string
  name: string
  description?: string
  structure: TemplateStructure
  is_public: boolean
  created_by: string
  created_at: string
  updated_at: string
  usage_count?: number
  rating?: number
  tags?: string[]
}

export interface CreateTemplateData {
  name: string
  description?: string
  workspace_id: string
  structure: TemplateStructure
  is_public?: boolean
}

export interface UpdateTemplateData {
  name?: string
  description?: string
  structure?: TemplateStructure
  is_public?: boolean
  tags?: string[]
}

export interface CreateProjectFromTemplateData {
  template_id: string
  project_name: string
  description?: string
  workspace_id: string
}

export class ProjectTemplateModel {
  /**
   * Validate template creation data
   */
  static validateCreate(data: CreateTemplateData): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!data.name || data.name.trim().length === 0) {
      errors.push('Template name is required')
    }

    if (data.name && data.name.trim().length < 2) {
      errors.push('Template name must be at least 2 characters long')
    }

    if (data.name && data.name.length > 200) {
      errors.push('Template name must be less than 200 characters')
    }

    if (!data.workspace_id || data.workspace_id.trim().length === 0) {
      errors.push('Workspace ID is required')
    }

    if (data.description && data.description.length > 2000) {
      errors.push('Template description must be less than 2000 characters')
    }

    if (!data.structure) {
      errors.push('Template structure is required')
    }

    // Validate structure
    if (data.structure) {
      const structureErrors = this.validateStructure(data.structure)
      errors.push(...structureErrors)
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  /**
   * Validate template structure
   */
  static validateStructure(structure: TemplateStructure): string[] {
    const errors: string[] = []

    if (!structure.defaultTasks || !Array.isArray(structure.defaultTasks)) {
      errors.push('Default tasks must be an array')
    } else {
      // Validate each task
      structure.defaultTasks.forEach((task, index) => {
        if (!task.title || task.title.trim().length === 0) {
          errors.push(`Task ${index + 1}: Title is required`)
        }
        if (!task.priority || !['low', 'medium', 'high', 'urgent'].includes(task.priority)) {
          errors.push(`Task ${index + 1}: Valid priority is required`)
        }
      })
    }

    if (!structure.customFields || !Array.isArray(structure.customFields)) {
      errors.push('Custom fields must be an array')
    } else {
      // Validate each field
      structure.customFields.forEach((field, index) => {
        if (!field.name || field.name.trim().length === 0) {
          errors.push(`Field ${index + 1}: Name is required`)
        }
        if (!field.type || !['text', 'number', 'date', 'checkbox', 'select'].includes(field.type)) {
          errors.push(`Field ${index + 1}: Valid type is required`)
        }
        if (field.type === 'select' && (!field.options || !Array.isArray(field.options) || field.options.length === 0)) {
          errors.push(`Field ${index + 1}: Options required for select type`)
        }
      })
    }

    return errors
  }

  /**
   * Validate template update data
   */
  static validateUpdate(data: UpdateTemplateData): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (data.name !== undefined) {
      if (data.name.trim().length === 0) {
        errors.push('Template name cannot be empty')
      }
      if (data.name.trim().length < 2) {
        errors.push('Template name must be at least 2 characters long')
      }
      if (data.name.length > 200) {
        errors.push('Template name must be less than 200 characters')
      }
    }

    if (data.description !== undefined && data.description && data.description.length > 2000) {
      errors.push('Template description must be less than 2000 characters')
    }

    if (data.structure) {
      const structureErrors = this.validateStructure(data.structure)
      errors.push(...structureErrors)
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  /**
   * Transform raw database response to ProjectTemplate interface
   */
  static fromDatabase(data: any): ProjectTemplate {
    return {
      id: data.id,
      user_id: data.user_id,
      workspace_id: data.workspace_id,
      name: data.name,
      description: data.description,
      structure: data.structure || { defaultTasks: [], customFields: [] },
      is_public: data.is_public || false,
      created_by: data.created_by,
      created_at: data.created_at,
      updated_at: data.updated_at,
      usage_count: data.usage_count || 0,
      rating: data.rating || 0,
      tags: data.tags || [],
    }
  }

  /**
   * Transform ProjectTemplate interface to database format
   */
  static toDatabase(template: Partial<ProjectTemplate>): any {
    return {
      id: template.id,
      user_id: template.user_id,
      workspace_id: template.workspace_id,
      name: template.name,
      description: template.description,
      structure: template.structure,
      is_public: template.is_public,
      created_by: template.created_by,
      created_at: template.created_at,
      updated_at: template.updated_at,
      usage_count: template.usage_count,
      rating: template.rating,
      tags: template.tags,
    }
  }

  /**
   * Get pre-built templates
   */
  static getPreBuiltTemplates(): Record<string, Partial<ProjectTemplate>> {
    return {
      'product-launch': {
        name: 'Product Launch',
        description: 'Structured workflow for launching a product',
        is_public: true,
        structure: {
          defaultTasks: [
            { title: 'Research & Strategy', description: 'Market research and product strategy', priority: 'high' },
            { title: 'Development', description: 'Build product MVP', priority: 'high' },
            { title: 'Testing & QA', description: 'Quality assurance and testing', priority: 'high' },
            { title: 'Marketing Prep', description: 'Prepare marketing materials', priority: 'medium' },
            { title: 'Launch', description: 'Product launch day', priority: 'high' },
          ],
          customFields: [
            { name: 'Target Market', type: 'text' },
            { name: 'Launch Date', type: 'date' },
            { name: 'Budget', type: 'number' },
          ],
        },
      },
      'marketing-campaign': {
        name: 'Marketing Campaign',
        description: 'Plan and execute a marketing campaign',
        is_public: true,
        structure: {
          defaultTasks: [
            { title: 'Define Campaign Goals', description: 'Set SMART goals', priority: 'high' },
            { title: 'Audience Research', description: 'Identify target audience', priority: 'high' },
            { title: 'Content Creation', description: 'Create marketing content', priority: 'high' },
            { title: 'Channel Setup', description: 'Configure marketing channels', priority: 'medium' },
            { title: 'Campaign Launch', description: 'Go live with campaign', priority: 'high' },
            { title: 'Monitor & Optimize', description: 'Track metrics and optimize', priority: 'medium' },
          ],
          customFields: [
            { name: 'Campaign Name', type: 'text' },
            { name: 'Budget', type: 'number' },
            { name: 'Target ROI %', type: 'number' },
          ],
        },
      },
      'software-development': {
        name: 'Software Development',
        description: 'Structure for software development projects',
        is_public: true,
        structure: {
          defaultTasks: [
            { title: 'Requirements & Analysis', description: 'Gather and document requirements', priority: 'high' },
            { title: 'Design', description: 'System design and architecture', priority: 'high' },
            { title: 'Implementation', description: 'Write and implement code', priority: 'high' },
            { title: 'Code Review', description: 'Peer code review and QA', priority: 'high' },
            { title: 'Testing', description: 'Unit and integration testing', priority: 'high' },
            { title: 'Deployment', description: 'Deploy to production', priority: 'high' },
            { title: 'Monitoring', description: 'Monitor and support post-launch', priority: 'medium' },
          ],
          customFields: [
            { name: 'Repository URL', type: 'text' },
            { name: 'Tech Stack', type: 'text' },
            { name: 'Development Team Size', type: 'number' },
          ],
        },
      },
    }
  }
}
