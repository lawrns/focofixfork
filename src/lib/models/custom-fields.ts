/**
 * Custom Fields Entity Models
 * Defines the structure and operations for custom fields system
 */

export type FieldType = 'text' | 'number' | 'date' | 'datetime' | 'boolean' | 'select' | 'multiselect' | 'url' | 'email'

export type FieldValidationType = 'required' | 'min_length' | 'max_length' | 'min_value' | 'max_value' | 'pattern' | 'custom'

export interface FieldValidation {
  type: FieldValidationType
  value?: any
  message?: string
}

export interface CustomFieldDefinition {
  id: string
  name: string
  key: string // machine-readable identifier
  type: FieldType
  description?: string
  entity_type: 'project' | 'milestone' | 'task' | 'workspace'
  workspace_id: string
  is_required: boolean
  is_system: boolean // system fields cannot be deleted
  default_value?: any
  options?: string[] // for select/multiselect fields
  validation_rules?: FieldValidation[]
  display_order: number
  is_active: boolean
  owner_id: string
  created_at: string
  updated_at: string
}

export interface CustomFieldValue {
  id: string
  field_definition_id: string
  entity_id: string // project/milestone/task ID
  entity_type: 'project' | 'milestone' | 'task' | 'workspace'
  value: any
  created_at: string
  updated_at: string
}

export interface CustomFieldWithValue extends CustomFieldDefinition {
  value?: any
  has_value?: boolean
}

export class CustomFieldModel {
  /**
   * Validate field definition creation/update
   */
  static validateFieldDefinition(data: Partial<CustomFieldDefinition>): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!data.name?.trim()) {
      errors.push('Field name is required')
    }

    if (!data.key?.trim()) {
      errors.push('Field key is required')
    } else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(data.key)) {
      errors.push('Field key must start with a letter or underscore and contain only letters, numbers, and underscores')
    }

    if (!data.type) {
      errors.push('Field type is required')
    }

    if (!data.entity_type || !['project', 'milestone', 'task', 'workspace'].includes(data.entity_type)) {
      errors.push('Valid entity type is required')
    }

    // Validate select options
    if ((data.type === 'select' || data.type === 'multiselect') && (!data.options || data.options.length === 0)) {
      errors.push('Select fields must have at least one option')
    }

    // Validate validation rules
    if (data.validation_rules) {
      data.validation_rules.forEach((rule, index) => {
        if (!rule.type) {
          errors.push(`Validation rule ${index + 1}: Type is required`)
        }
        if (rule.type !== 'required' && rule.value == null) {
          errors.push(`Validation rule ${index + 1}: Value is required for ${rule.type}`)
        }
      })
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Validate field value against definition
   */
  static validateFieldValue(value: any, definition: CustomFieldDefinition): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    // Check required
    if (definition.is_required && (value == null || value === '')) {
      errors.push(`${definition.name} is required`)
      return { isValid: false, errors }
    }

    // If not required and empty, skip other validations
    if (value == null || value === '') {
      return { isValid: true, errors: [] }
    }

    // Type validation
    switch (definition.type) {
      case 'number':
        if (isNaN(Number(value))) {
          errors.push(`${definition.name} must be a valid number`)
        }
        break
      case 'date':
        if (isNaN(Date.parse(value))) {
          errors.push(`${definition.name} must be a valid date`)
        }
        break
      case 'datetime':
        if (isNaN(Date.parse(value))) {
          errors.push(`${definition.name} must be a valid date and time`)
        }
        break
      case 'boolean':
        if (typeof value !== 'boolean' && value !== 'true' && value !== 'false') {
          errors.push(`${definition.name} must be true or false`)
        }
        break
      case 'select':
        if (definition.options && !definition.options.includes(value)) {
          errors.push(`${definition.name} must be one of: ${definition.options.join(', ')}`)
        }
        break
      case 'multiselect':
        if (!Array.isArray(value)) {
          errors.push(`${definition.name} must be a list of values`)
        } else if (definition.options) {
          const invalidOptions = value.filter(v => !definition.options!.includes(v))
          if (invalidOptions.length > 0) {
            errors.push(`${definition.name} contains invalid options: ${invalidOptions.join(', ')}`)
          }
        }
        break
      case 'url':
        try {
          new URL(value)
        } catch {
          errors.push(`${definition.name} must be a valid URL`)
        }
        break
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(value)) {
          errors.push(`${definition.name} must be a valid email address`)
        }
        break
    }

    // Custom validation rules
    if (definition.validation_rules) {
      definition.validation_rules.forEach(rule => {
        const error = this.validateRule(value, rule, definition)
        if (error) errors.push(error)
      })
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Validate individual validation rule
   */
  private static validateRule(value: any, rule: FieldValidation, definition: CustomFieldDefinition): string | null {
    switch (rule.type) {
      case 'required':
        if (value == null || value === '') {
          return rule.message || `${definition.name} is required`
        }
        break

      case 'min_length':
        if (typeof value === 'string' && value.length < rule.value) {
          return rule.message || `${definition.name} must be at least ${rule.value} characters`
        }
        break

      case 'max_length':
        if (typeof value === 'string' && value.length > rule.value) {
          return rule.message || `${definition.name} must be no more than ${rule.value} characters`
        }
        break

      case 'min_value':
        if (typeof value === 'number' && value < rule.value) {
          return rule.message || `${definition.name} must be at least ${rule.value}`
        }
        break

      case 'max_value':
        if (typeof value === 'number' && value > rule.value) {
          return rule.message || `${definition.name} must be no more than ${rule.value}`
        }
        break

      case 'pattern':
        if (typeof value === 'string' && !new RegExp(rule.value).test(value)) {
          return rule.message || `${definition.name} format is invalid`
        }
        break
    }

    return null
  }

  /**
   * Get default value for field type
   */
  static getDefaultValueForType(type: FieldType): any {
    switch (type) {
      case 'boolean':
        return false
      case 'number':
        return 0
      case 'select':
      case 'multiselect':
        return null
      case 'text':
      case 'url':
      case 'email':
        return ''
      case 'date':
      case 'datetime':
        return null
      default:
        return null
    }
  }

  /**
   * Format field value for display
   */
  static formatFieldValue(value: any, type: FieldType): string {
    if (value == null || value === '') return ''

    switch (type) {
      case 'boolean':
        return value ? 'Yes' : 'No'
      case 'date':
        return new Date(value).toLocaleDateString()
      case 'datetime':
        return new Date(value).toLocaleString()
      case 'multiselect':
        return Array.isArray(value) ? value.join(', ') : String(value)
      default:
        return String(value)
    }
  }

  /**
   * Transform raw database response to CustomFieldDefinition
   */
  static fromDatabase(data: any): CustomFieldDefinition {
    return {
      id: data.id,
      name: data.name,
      key: data.key,
      type: data.type,
      description: data.description,
      entity_type: data.entity_type,
      workspace_id: data.workspace_id || data.organization_id,
      is_required: data.is_required,
      is_system: data.is_system,
      default_value: data.default_value,
      options: data.options,
      validation_rules: data.validation_rules,
      display_order: data.display_order,
      is_active: data.is_active,
      owner_id: data.owner_id || data.created_by,
      created_at: data.created_at,
      updated_at: data.updated_at
    }
  }

  /**
   * Transform raw database response to CustomFieldValue
   */
  static valueFromDatabase(data: any): CustomFieldValue {
    return {
      id: data.id,
      field_definition_id: data.field_definition_id,
      entity_id: data.entity_id,
      entity_type: data.entity_type,
      value: data.value,
      created_at: data.created_at,
      updated_at: data.updated_at
    }
  }
}


