'use client'

import { useState, useEffect, useCallback } from 'react'
import { ExtensionManifest } from '@/lib/extensions/extension-api'

// Custom Fields Power-Up
export const customFieldsManifest: ExtensionManifest = {
  id: 'custom-fields',
  name: 'Custom Fields',
  version: '1.5.2',
  description: 'Add custom fields to your projects and tasks for better organization and tracking.',
  author: 'CustomFields Team',
  icon: '/icons/fields.svg',
  permissions: [
    { type: 'read', resource: 'projects', description: 'Read project data' },
    { type: 'write', resource: 'projects', description: 'Update project data' },
    { type: 'storage', resource: 'custom-fields', description: 'Store custom field definitions' }
  ],
  entryPoints: [
    { type: 'card', component: 'CustomFields', position: 'bottom', priority: 1 },
    { type: 'project', component: 'FieldManager', position: 'right', priority: 2 }
  ],
  dependencies: [],
  minVersion: '1.0.0'
}

// Custom Fields Types
interface CustomField {
  id: string
  name: string
  type: 'text' | 'number' | 'date' | 'boolean' | 'select' | 'multiselect' | 'url' | 'email'
  description?: string
  required: boolean
  defaultValue?: any
  options?: string[] // For select and multiselect types
  validation?: {
    min?: number
    max?: number
    pattern?: string
    message?: string
  }
  projectId?: string // If null, it's a global field
  createdAt: Date
  updatedAt: Date
}

interface CustomFieldValue {
  id: string
  fieldId: string
  entityId: string // Project ID or Task ID
  entityType: 'project' | 'task'
  value: any
  createdAt: Date
  updatedAt: Date
}

interface CustomFieldSettings {
  allowGlobalFields: boolean
  allowProjectFields: boolean
  maxFieldsPerProject: number
  defaultFieldTypes: string[]
  fieldValidation: {
    enabled: boolean
    strictMode: boolean
  }
}

// Custom Fields Service
class CustomFieldsService {
  private settings: CustomFieldSettings | null = null

  async loadSettings(api: any): Promise<CustomFieldSettings | null> {
    try {
      const settings = await api.getStorage('custom-fields-settings')
      this.settings = settings
      return settings
    } catch (error) {
      api.log(`Failed to load custom fields settings: ${error}`, 'error')
      return null
    }
  }

  async saveSettings(api: any, settings: CustomFieldSettings): Promise<void> {
    try {
      await api.setStorage('custom-fields-settings', settings)
      this.settings = settings
    } catch (error) {
      api.log(`Failed to save custom fields settings: ${error}`, 'error')
      throw error
    }
  }

  async getFields(api: any, projectId?: string): Promise<CustomField[]> {
    try {
      const fields = await api.getStorage('custom-fields') || []
      
      if (projectId) {
        return fields.filter((field: CustomField) => 
          field.projectId === projectId || field.projectId === null
        )
      }
      
      return fields
    } catch (error) {
      api.log(`Failed to get custom fields: ${error}`, 'error')
      return []
    }
  }

  async saveField(api: any, field: CustomField): Promise<void> {
    try {
      const fields = await this.getFields(api)
      const existingIndex = fields.findIndex(f => f.id === field.id)
      
      if (existingIndex >= 0) {
        fields[existingIndex] = field
      } else {
        fields.push(field)
      }
      
      await api.setStorage('custom-fields', fields)
    } catch (error) {
      api.log(`Failed to save custom field: ${error}`, 'error')
      throw error
    }
  }

  async deleteField(api: any, fieldId: string): Promise<void> {
    try {
      const fields = await this.getFields(api)
      const filteredFields = fields.filter(f => f.id !== fieldId)
      await api.setStorage('custom-fields', filteredFields)
      
      // Also delete all values for this field
      const values = await this.getFieldValues(api)
      const filteredValues = values.filter(v => v.fieldId !== fieldId)
      await api.setStorage('custom-field-values', filteredValues)
    } catch (error) {
      api.log(`Failed to delete custom field: ${error}`, 'error')
      throw error
    }
  }

  async getFieldValues(api: any, entityId?: string, entityType?: 'project' | 'task'): Promise<CustomFieldValue[]> {
    try {
      const values = await api.getStorage('custom-field-values') || []
      
      if (entityId && entityType) {
        return values.filter((value: CustomFieldValue) => 
          value.entityId === entityId && value.entityType === entityType
        )
      }
      
      return values
    } catch (error) {
      api.log(`Failed to get custom field values: ${error}`, 'error')
      return []
    }
  }

  async saveFieldValue(api: any, value: CustomFieldValue): Promise<void> {
    try {
      const values = await this.getFieldValues(api)
      const existingIndex = values.findIndex(v => 
        v.fieldId === value.fieldId && 
        v.entityId === value.entityId && 
        v.entityType === value.entityType
      )
      
      if (existingIndex >= 0) {
        values[existingIndex] = value
      } else {
        values.push(value)
      }
      
      await api.setStorage('custom-field-values', values)
    } catch (error) {
      api.log(`Failed to save custom field value: ${error}`, 'error')
      throw error
    }
  }

  async deleteFieldValue(api: any, fieldId: string, entityId: string, entityType: 'project' | 'task'): Promise<void> {
    try {
      const values = await this.getFieldValues(api)
      const filteredValues = values.filter(v => 
        !(v.fieldId === fieldId && v.entityId === entityId && v.entityType === entityType)
      )
      await api.setStorage('custom-field-values', filteredValues)
    } catch (error) {
      api.log(`Failed to delete custom field value: ${error}`, 'error')
      throw error
    }
  }

  validateFieldValue(field: CustomField, value: any): { valid: boolean; error?: string } {
    if (field.required && (value === null || value === undefined || value === '')) {
      return { valid: false, error: `${field.name} is required` }
    }

    if (value === null || value === undefined || value === '') {
      return { valid: true } // Empty values are valid for non-required fields
    }

    switch (field.type) {
      case 'text':
        if (typeof value !== 'string') {
          return { valid: false, error: `${field.name} must be text` }
        }
        if (field.validation?.pattern && !new RegExp(field.validation.pattern).test(value)) {
          return { valid: false, error: field.validation.message || `${field.name} format is invalid` }
        }
        break

      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          return { valid: false, error: `${field.name} must be a number` }
        }
        if (field.validation?.min !== undefined && value < field.validation.min) {
          return { valid: false, error: `${field.name} must be at least ${field.validation.min}` }
        }
        if (field.validation?.max !== undefined && value > field.validation.max) {
          return { valid: false, error: `${field.name} must be at most ${field.validation.max}` }
        }
        break

      case 'date':
        if (!(value instanceof Date) && !Date.parse(value)) {
          return { valid: false, error: `${field.name} must be a valid date` }
        }
        break

      case 'boolean':
        if (typeof value !== 'boolean') {
          return { valid: false, error: `${field.name} must be true or false` }
        }
        break

      case 'select':
        if (!field.options?.includes(value)) {
          return { valid: false, error: `${field.name} must be one of: ${field.options?.join(', ')}` }
        }
        break

      case 'multiselect':
        if (!Array.isArray(value)) {
          return { valid: false, error: `${field.name} must be an array` }
        }
        if (value.some(v => !field.options?.includes(v))) {
          return { valid: false, error: `${field.name} contains invalid options` }
        }
        break

      case 'url':
        if (typeof value !== 'string' || !/^https?:\/\/.+/.test(value)) {
          return { valid: false, error: `${field.name} must be a valid URL` }
        }
        break

      case 'email':
        if (typeof value !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return { valid: false, error: `${field.name} must be a valid email address` }
        }
        break
    }

    return { valid: true }
  }

  getFieldTypeIcon(type: string): string {
    switch (type) {
      case 'text': return '📝'
      case 'number': return '🔢'
      case 'date': return '📅'
      case 'boolean': return '☑️'
      case 'select': return '📋'
      case 'multiselect': return '📋'
      case 'url': return '🔗'
      case 'email': return '📧'
      default: return '❓'
    }
  }

  formatFieldValue(field: CustomField, value: any): string {
    if (value === null || value === undefined) {
      return field.defaultValue || ''
    }

    switch (field.type) {
      case 'date':
        return new Date(value).toLocaleDateString()
      case 'boolean':
        return value ? 'Yes' : 'No'
      case 'multiselect':
        return Array.isArray(value) ? value.join(', ') : ''
      default:
        return String(value)
    }
  }
}

// Custom Fields Component
export function CustomFields({ context, api }: { context: any; api: any }) {
  const [fields, setFields] = useState<CustomField[]>([])
  const [values, setValues] = useState<CustomFieldValue[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingField, setEditingField] = useState<string | null>(null)

  const fieldsService = new CustomFieldsService()

  // Load fields and values
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const loadedFields = await fieldsService.getFields(api, context.projectId)
        setFields(loadedFields)
        
        if (context.taskId) {
          const loadedValues = await fieldsService.getFieldValues(api, context.taskId, 'task')
          setValues(loadedValues)
        } else if (context.projectId) {
          const loadedValues = await fieldsService.getFieldValues(api, context.projectId, 'project')
          setValues(loadedValues)
        }
      } catch (err) {
        setError(`Failed to load custom fields: ${err}`)
        api.log(`Custom fields error: ${err}`, 'error')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [context.projectId, context.taskId, api])

  // Handle value update
  const handleValueUpdate = async (fieldId: string, value: any) => {
    try {
      const field = fields.find(f => f.id === fieldId)
      if (!field) return

      // Validate value
      const validation = fieldsService.validateFieldValue(field, value)
      if (!validation.valid) {
        api.showToast(validation.error!, 'error')
        return
      }

      const fieldValue: CustomFieldValue = {
        id: `value-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        fieldId,
        entityId: context.taskId || context.projectId,
        entityType: context.taskId ? 'task' : 'project',
        value,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      await fieldsService.saveFieldValue(api, fieldValue)
      
      // Update local state
      setValues(prev => {
        const existing = prev.find(v => v.fieldId === fieldId)
        if (existing) {
          return prev.map(v => v.fieldId === fieldId ? fieldValue : v)
        } else {
          return [...prev, fieldValue]
        }
      })

      api.showToast('Field value updated', 'success')
    } catch (err) {
      api.showToast(`Failed to update field value: ${err}`, 'error')
    }
  }

  // Get value for field
  const getFieldValue = (fieldId: string): any => {
    const value = values.find(v => v.fieldId === fieldId)
    return value?.value
  }

  if (loading) {
    return (
      <div className="p-4 border rounded-lg">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto" />
      </div>
    )
  }

  return (
    <div className="p-4 border rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold">Custom Fields</h4>
        <button
          onClick={() => api.showModal('CustomFieldManager', { 
            projectId: context.projectId,
            onFieldUpdate: () => {
              // Reload fields
              fieldsService.getFields(api, context.projectId).then(setFields)
            }
          })}
          className="text-gray-400 hover:text-gray-600"
        >
          ⚙️
        </button>
      </div>

      {error && (
        <div className="text-red-600 text-sm mb-3">{error}</div>
      )}

      <div className="space-y-3">
        {fields.length === 0 ? (
          <div className="text-center py-4 text-gray-600">
            <p className="text-sm">No custom fields defined</p>
            <button
              onClick={() => api.showModal('CustomFieldManager', { 
                projectId: context.projectId,
                onFieldUpdate: () => {
                  fieldsService.getFields(api, context.projectId).then(setFields)
                }
              })}
              className="text-blue-600 hover:underline text-sm mt-2"
            >
              Add Custom Fields
            </button>
          </div>
        ) : (
          fields.map(field => (
            <div key={field.id} className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm">{fieldsService.getFieldTypeIcon(field.type)}</span>
                <label className="text-sm font-medium">
                  {field.name}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>
              </div>
              
              <div className="ml-6">
                {field.type === 'text' && (
                  <input
                    type="text"
                    value={getFieldValue(field.id) || ''}
                    onChange={(e) => handleValueUpdate(field.id, e.target.value)}
                    placeholder={field.description}
                    className="w-full p-2 border rounded text-sm"
                  />
                )}
                
                {field.type === 'number' && (
                  <input
                    type="number"
                    value={getFieldValue(field.id) || ''}
                    onChange={(e) => handleValueUpdate(field.id, parseFloat(e.target.value) || 0)}
                    placeholder={field.description}
                    className="w-full p-2 border rounded text-sm"
                  />
                )}
                
                {field.type === 'date' && (
                  <input
                    type="date"
                    value={getFieldValue(field.id) ? new Date(getFieldValue(field.id)).toISOString().split('T')[0] : ''}
                    onChange={(e) => handleValueUpdate(field.id, e.target.value)}
                    className="w-full p-2 border rounded text-sm"
                  />
                )}
                
                {field.type === 'boolean' && (
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={getFieldValue(field.id) || false}
                      onChange={(e) => handleValueUpdate(field.id, e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-600">{field.description}</span>
                  </label>
                )}
                
                {field.type === 'select' && (
                  <select
                    value={getFieldValue(field.id) || ''}
                    onChange={(e) => handleValueUpdate(field.id, e.target.value)}
                    className="w-full p-2 border rounded text-sm"
                  >
                    <option value="">Select an option</option>
                    {field.options?.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                )}
                
                {field.type === 'multiselect' && (
                  <div className="space-y-1">
                    {field.options?.map(option => (
                      <label key={option} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={(getFieldValue(field.id) || []).includes(option)}
                          onChange={(e) => {
                            const currentValues = getFieldValue(field.id) || []
                            const newValues = e.target.checked
                              ? [...currentValues, option]
                              : currentValues.filter(v => v !== option)
                            handleValueUpdate(field.id, newValues)
                          }}
                          className="rounded"
                        />
                        <span className="text-sm">{option}</span>
                      </label>
                    ))}
                  </div>
                )}
                
                {field.type === 'url' && (
                  <input
                    type="url"
                    value={getFieldValue(field.id) || ''}
                    onChange={(e) => handleValueUpdate(field.id, e.target.value)}
                    placeholder={field.description}
                    className="w-full p-2 border rounded text-sm"
                  />
                )}
                
                {field.type === 'email' && (
                  <input
                    type="email"
                    value={getFieldValue(field.id) || ''}
                    onChange={(e) => handleValueUpdate(field.id, e.target.value)}
                    placeholder={field.description}
                    className="w-full p-2 border rounded text-sm"
                  />
                )}
              </div>
              
              {field.description && (
                <div className="ml-6 text-xs text-gray-500">{field.description}</div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// Field Manager Component
export function FieldManager({ context, api }: { context: any; api: any }) {
  const [fields, setFields] = useState<CustomField[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fieldsService = new CustomFieldsService()

  // Load fields
  useEffect(() => {
    const loadFields = async () => {
      setLoading(true)
      try {
        const loadedFields = await fieldsService.getFields(api, context.projectId)
        setFields(loadedFields)
      } catch (err) {
        setError(`Failed to load fields: ${err}`)
        api.log(`Field manager error: ${err}`, 'error')
      } finally {
        setLoading(false)
      }
    }
    loadFields()
  }, [context.projectId, api])

  // Handle field creation
  const handleCreateField = async (fieldData: Omit<CustomField, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const field: CustomField = {
        ...fieldData,
        id: `field-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      await fieldsService.saveField(api, field)
      setFields(prev => [...prev, field])
      api.showToast('Custom field created', 'success')
    } catch (err) {
      api.showToast(`Failed to create field: ${err}`, 'error')
    }
  }

  // Handle field update
  const handleUpdateField = async (fieldId: string, updates: Partial<CustomField>) => {
    try {
      const field = fields.find(f => f.id === fieldId)
      if (!field) return

      const updatedField = { ...field, ...updates, updatedAt: new Date() }
      await fieldsService.saveField(api, updatedField)
      setFields(prev => prev.map(f => f.id === fieldId ? updatedField : f))
      api.showToast('Custom field updated', 'success')
    } catch (err) {
      api.showToast(`Failed to update field: ${err}`, 'error')
    }
  }

  // Handle field deletion
  const handleDeleteField = async (fieldId: string) => {
    try {
      await fieldsService.deleteField(api, fieldId)
      setFields(prev => prev.filter(f => f.id !== fieldId))
      api.showToast('Custom field deleted', 'success')
    } catch (err) {
      api.showToast(`Failed to delete field: ${err}`, 'error')
    }
  }

  if (loading) {
    return (
      <div className="p-4 border rounded-lg">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto" />
      </div>
    )
  }

  return (
    <div className="p-4 border rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold">Field Manager</h4>
        <button
          onClick={() => api.showModal('CreateCustomField', { 
            projectId: context.projectId,
            onSubmit: handleCreateField 
          })}
          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Add Field
        </button>
      </div>

      {error && (
        <div className="text-red-600 text-sm mb-3">{error}</div>
      )}

      <div className="space-y-3">
        {fields.length === 0 ? (
          <div className="text-center py-4 text-gray-600">
            <p className="text-sm">No custom fields defined</p>
          </div>
        ) : (
          fields.map(field => (
            <div key={field.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <div className="flex items-center gap-3">
                <span className="text-lg">{fieldsService.getFieldTypeIcon(field.type)}</span>
                <div>
                  <div className="font-medium">{field.name}</div>
                  <div className="text-sm text-gray-600">
                    {field.type} • {field.required ? 'Required' : 'Optional'}
                    {field.projectId ? ' • Project Field' : ' • Global Field'}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => api.showModal('EditCustomField', { 
                    field,
                    onSubmit: (updates: Partial<CustomField>) => handleUpdateField(field.id, updates)
                  })}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✏️
                </button>
                <button
                  onClick={() => handleDeleteField(field.id)}
                  className="text-gray-400 hover:text-red-600"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// Export the extension code
export const customFieldsCode = `
import React, { useState, useEffect, useCallback } from 'react'

// Custom Fields Types
interface CustomField {
  id: string
  name: string
  type: 'text' | 'number' | 'date' | 'boolean' | 'select' | 'multiselect' | 'url' | 'email'
  description?: string
  required: boolean
  defaultValue?: any
  options?: string[] // For select and multiselect types
  validation?: {
    min?: number
    max?: number
    pattern?: string
    message?: string
  }
  projectId?: string // If null, it's a global field
  createdAt: Date
  updatedAt: Date
}

interface CustomFieldValue {
  id: string
  fieldId: string
  entityId: string // Project ID or Task ID
  entityType: 'project' | 'task'
  value: any
  createdAt: Date
  updatedAt: Date
}

// Custom Fields Service
class CustomFieldsService {
  constructor() {
    this.settings = null
  }

  async loadSettings(api) {
    try {
      const settings = await api.getStorage('custom-fields-settings')
      this.settings = settings
      return settings
    } catch (error) {
      api.log(\`Failed to load custom fields settings: \${error}\`, 'error')
      return null
    }
  }

  async saveSettings(api, settings) {
    try {
      await api.setStorage('custom-fields-settings', settings)
      this.settings = settings
    } catch (error) {
      api.log(\`Failed to save custom fields settings: \${error}\`, 'error')
      throw error
    }
  }

  async getFields(api, projectId) {
    try {
      const fields = await api.getStorage('custom-fields') || []
      
      if (projectId) {
        return fields.filter(field => 
          field.projectId === projectId || field.projectId === null
        )
      }
      
      return fields
    } catch (error) {
      api.log(\`Failed to get custom fields: \${error}\`, 'error')
      return []
    }
  }

  async saveField(api, field) {
    try {
      const fields = await this.getFields(api)
      const existingIndex = fields.findIndex(f => f.id === field.id)
      
      if (existingIndex >= 0) {
        fields[existingIndex] = field
      } else {
        fields.push(field)
      }
      
      await api.setStorage('custom-fields', fields)
    } catch (error) {
      api.log(\`Failed to save custom field: \${error}\`, 'error')
      throw error
    }
  }

  async getFieldValues(api, entityId, entityType) {
    try {
      const values = await api.getStorage('custom-field-values') || []
      
      if (entityId && entityType) {
        return values.filter(value => 
          value.entityId === entityId && value.entityType === entityType
        )
      }
      
      return values
    } catch (error) {
      api.log(\`Failed to get custom field values: \${error}\`, 'error')
      return []
    }
  }

  async saveFieldValue(api, value) {
    try {
      const values = await this.getFieldValues(api)
      const existingIndex = values.findIndex(v => 
        v.fieldId === value.fieldId && 
        v.entityId === value.entityId && 
        v.entityType === value.entityType
      )
      
      if (existingIndex >= 0) {
        values[existingIndex] = value
      } else {
        values.push(value)
      }
      
      await api.setStorage('custom-field-values', values)
    } catch (error) {
      api.log(\`Failed to save custom field value: \${error}\`, 'error')
      throw error
    }
  }

  validateFieldValue(field, value) {
    if (field.required && (value === null || value === undefined || value === '')) {
      return { valid: false, error: \`\${field.name} is required\` }
    }

    if (value === null || value === undefined || value === '') {
      return { valid: true } // Empty values are valid for non-required fields
    }

    switch (field.type) {
      case 'text':
        if (typeof value !== 'string') {
          return { valid: false, error: \`\${field.name} must be text\` }
        }
        if (field.validation?.pattern && !new RegExp(field.validation.pattern).test(value)) {
          return { valid: false, error: field.validation.message || \`\${field.name} format is invalid\` }
        }
        break

      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          return { valid: false, error: \`\${field.name} must be a number\` }
        }
        if (field.validation?.min !== undefined && value < field.validation.min) {
          return { valid: false, error: \`\${field.name} must be at least \${field.validation.min}\` }
        }
        if (field.validation?.max !== undefined && value > field.validation.max) {
          return { valid: false, error: \`\${field.name} must be at most \${field.validation.max}\` }
        }
        break

      case 'date':
        if (!(value instanceof Date) && !Date.parse(value)) {
          return { valid: false, error: \`\${field.name} must be a valid date\` }
        }
        break

      case 'boolean':
        if (typeof value !== 'boolean') {
          return { valid: false, error: \`\${field.name} must be true or false\` }
        }
        break

      case 'select':
        if (!field.options?.includes(value)) {
          return { valid: false, error: \`\${field.name} must be one of: \${field.options?.join(', ')}\` }
        }
        break

      case 'multiselect':
        if (!Array.isArray(value)) {
          return { valid: false, error: \`\${field.name} must be an array\` }
        }
        if (value.some(v => !field.options?.includes(v))) {
          return { valid: false, error: \`\${field.name} contains invalid options\` }
        }
        break

      case 'url':
        if (typeof value !== 'string' || !/^https?:\\/\\/.+/.test(value)) {
          return { valid: false, error: \`\${field.name} must be a valid URL\` }
        }
        break

      case 'email':
        if (typeof value !== 'string' || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(value)) {
          return { valid: false, error: \`\${field.name} must be a valid email address\` }
        }
        break
    }

    return { valid: true }
  }

  getFieldTypeIcon(type) {
    switch (type) {
      case 'text': return '📝'
      case 'number': return '🔢'
      case 'date': return '📅'
      case 'boolean': return '☑️'
      case 'select': return '📋'
      case 'multiselect': return '📋'
      case 'url': return '🔗'
      case 'email': return '📧'
      default: return '❓'
    }
  }

  formatFieldValue(field, value) {
    if (value === null || value === undefined) {
      return field.defaultValue || ''
    }

    switch (field.type) {
      case 'date':
        return new Date(value).toLocaleDateString()
      case 'boolean':
        return value ? 'Yes' : 'No'
      case 'multiselect':
        return Array.isArray(value) ? value.join(', ') : ''
      default:
        return String(value)
    }
  }
}

// Custom Fields Component
function CustomFields({ context, api }) {
  const [fields, setFields] = useState([])
  const [values, setValues] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fieldsService = new CustomFieldsService()

  // Load fields and values
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const loadedFields = await fieldsService.getFields(api, context.projectId)
        setFields(loadedFields)
        
        if (context.taskId) {
          const loadedValues = await fieldsService.getFieldValues(api, context.taskId, 'task')
          setValues(loadedValues)
        } else if (context.projectId) {
          const loadedValues = await fieldsService.getFieldValues(api, context.projectId, 'project')
          setValues(loadedValues)
        }
      } catch (err) {
        setError(\`Failed to load custom fields: \${err}\`)
        api.log(\`Custom fields error: \${err}\`, 'error')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // Handle value update
  const handleValueUpdate = async (fieldId, value) => {
    try {
      const field = fields.find(f => f.id === fieldId)
      if (!field) return

      // Validate value
      const validation = fieldsService.validateFieldValue(field, value)
      if (!validation.valid) {
        api.showToast(validation.error, 'error')
        return
      }

      const fieldValue = {
        id: \`value-\${Date.now()}-\${Math.random().toString(36).substr(2, 9)}\`,
        fieldId,
        entityId: context.taskId || context.projectId,
        entityType: context.taskId ? 'task' : 'project',
        value,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      await fieldsService.saveFieldValue(api, fieldValue)
      
      // Update local state
      setValues(prev => {
        const existing = prev.find(v => v.fieldId === fieldId)
        if (existing) {
          return prev.map(v => v.fieldId === fieldId ? fieldValue : v)
        } else {
          return [...prev, fieldValue]
        }
      })

      api.showToast('Field value updated', 'success')
    } catch (err) {
      api.showToast(\`Failed to update field value: \${err}\`, 'error')
    }
  }

  // Get value for field
  const getFieldValue = (fieldId) => {
    const value = values.find(v => v.fieldId === fieldId)
    return value?.value
  }

  if (loading) {
    return (
      <div className="p-4 border rounded-lg">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto" />
      </div>
    )
  }

  return (
    <div className="p-4 border rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold">Custom Fields</h4>
      </div>

      {error && (
        <div className="text-red-600 text-sm mb-3">{error}</div>
      )}

      <div className="space-y-3">
        {fields.length === 0 ? (
          <div className="text-center py-4 text-gray-600">
            <p className="text-sm">No custom fields defined</p>
          </div>
        ) : (
          fields.map(field => (
            <div key={field.id} className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm">{fieldsService.getFieldTypeIcon(field.type)}</span>
                <label className="text-sm font-medium">
                  {field.name}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>
              </div>
              
              <div className="ml-6">
                {field.type === 'text' && (
                  <input
                    type="text"
                    value={getFieldValue(field.id) || ''}
                    onChange={(e) => handleValueUpdate(field.id, e.target.value)}
                    placeholder={field.description}
                    className="w-full p-2 border rounded text-sm"
                  />
                )}
                
                {field.type === 'number' && (
                  <input
                    type="number"
                    value={getFieldValue(field.id) || ''}
                    onChange={(e) => handleValueUpdate(field.id, parseFloat(e.target.value) || 0)}
                    placeholder={field.description}
                    className="w-full p-2 border rounded text-sm"
                  />
                )}
                
                {field.type === 'date' && (
                  <input
                    type="date"
                    value={getFieldValue(field.id) ? new Date(getFieldValue(field.id)).toISOString().split('T')[0] : ''}
                    onChange={(e) => handleValueUpdate(field.id, e.target.value)}
                    className="w-full p-2 border rounded text-sm"
                  />
                )}
                
                {field.type === 'boolean' && (
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={getFieldValue(field.id) || false}
                      onChange={(e) => handleValueUpdate(field.id, e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-600">{field.description}</span>
                  </label>
                )}
                
                {field.type === 'select' && (
                  <select
                    value={getFieldValue(field.id) || ''}
                    onChange={(e) => handleValueUpdate(field.id, e.target.value)}
                    className="w-full p-2 border rounded text-sm"
                  >
                    <option value="">Select an option</option>
                    {field.options?.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                )}
              </div>
              
              {field.description && (
                <div className="ml-6 text-xs text-gray-500">{field.description}</div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// Field Manager Component
function FieldManager({ context, api }) {
  const [fields, setFields] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fieldsService = new CustomFieldsService()

  // Load fields
  useEffect(() => {
    const loadFields = async () => {
      setLoading(true)
      try {
        const loadedFields = await fieldsService.getFields(api, context.projectId)
        setFields(loadedFields)
      } catch (err) {
        setError(\`Failed to load fields: \${err}\`)
        api.log(\`Field manager error: \${err}\`, 'error')
      } finally {
        setLoading(false)
      }
    }
    loadFields()
  }, [])

  if (loading) {
    return (
      <div className="p-4 border rounded-lg">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto" />
      </div>
    )
  }

  return (
    <div className="p-4 border rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold">Field Manager</h4>
        <button
          onClick={() => api.showModal('CreateCustomField', { 
            projectId: context.projectId
          })}
          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Add Field
        </button>
      </div>

      {error && (
        <div className="text-red-600 text-sm mb-3">{error}</div>
      )}

      <div className="space-y-3">
        {fields.length === 0 ? (
          <div className="text-center py-4 text-gray-600">
            <p className="text-sm">No custom fields defined</p>
          </div>
        ) : (
          fields.map(field => (
            <div key={field.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <div className="flex items-center gap-3">
                <span className="text-lg">{fieldsService.getFieldTypeIcon(field.type)}</span>
                <div>
                  <div className="font-medium">{field.name}</div>
                  <div className="text-sm text-gray-600">
                    {field.type} • {field.required ? 'Required' : 'Optional'}
                    {field.projectId ? ' • Project Field' : ' • Global Field'}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// Export components
export default {
  CustomFields,
  FieldManager
}
`
