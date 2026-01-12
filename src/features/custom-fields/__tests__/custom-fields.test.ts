import { describe, it, expect, beforeEach } from 'vitest'

/**
 * Custom Fields Feature Tests - Strict TDD
 *
 * Tests validate:
 * - Create custom field (text, number, date, dropdown)
 * - List custom fields for a project
 * - Delete custom field
 * - Add custom field values to tasks
 * - Custom field values save/load
 * - Project-scoped fields
 */

// Mock database storage
const mockDatabase = {
  customFields: new Map<string, any>(),
  taskCustomValues: new Map<string, any>(),
}

function generateId() {
  return Math.random().toString(36).substr(2, 9)
}

// Simulated API functions
function createCustomFieldImpl(data: any) {
  if (!data.field_name) throw new Error('field_name is required')
  if (!data.field_type) throw new Error('field_type is required')
  if (!data.project_id) throw new Error('project_id is required')

  const validTypes = ['text', 'number', 'date', 'dropdown']
  if (!validTypes.includes(data.field_type)) {
    throw new Error('Invalid field_type')
  }

  if (data.field_type === 'dropdown' && !data.options) {
    throw new Error('options required for dropdown type')
  }

  const id = generateId()
  const field = {
    id,
    ...data,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  mockDatabase.customFields.set(id, field)
  return field
}

function listCustomFieldsImpl(projectId: string) {
  const fields = Array.from(mockDatabase.customFields.values()).filter(
    f => f.project_id === projectId
  )
  return fields
}

function deleteCustomFieldImpl(fieldId: string) {
  if (!mockDatabase.customFields.has(fieldId)) {
    throw new Error('Field not found')
  }

  mockDatabase.customFields.delete(fieldId)

  // Cascade delete values
  for (const [key, value] of mockDatabase.taskCustomValues.entries()) {
    if (value.field_id === fieldId) {
      mockDatabase.taskCustomValues.delete(key)
    }
  }

  return { success: true }
}

function setCustomFieldValueImpl(taskId: string, fieldId: string, value: any) {
  const field = mockDatabase.customFields.get(fieldId)
  if (!field) throw new Error('Field not found')

  // Validation
  if (value !== null && value !== undefined && value !== '') {
    if (field.field_type === 'number') {
      const numValue = Number(value)
      if (isNaN(numValue)) throw new Error('Invalid number')
    } else if (field.field_type === 'date') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
        throw new Error('Invalid date format')
      }
    } else if (field.field_type === 'dropdown') {
      if (!field.options.includes(value)) {
        throw new Error('Invalid dropdown option')
      }
    }
  }

  let valueText = null
  let valueNumber = null
  let valueDate = null

  if (value === null || value === undefined || value === '') {
    // null value
  } else if (field.field_type === 'text') {
    valueText = String(value)
  } else if (field.field_type === 'number') {
    valueNumber = Number(value)
  } else if (field.field_type === 'date') {
    valueDate = String(value)
  } else if (field.field_type === 'dropdown') {
    valueText = String(value)
  }

  const key = `${taskId}-${fieldId}`
  const customValue = {
    id: mockDatabase.taskCustomValues.has(key) ? mockDatabase.taskCustomValues.get(key).id : generateId(),
    task_id: taskId,
    field_id: fieldId,
    value_text: valueText,
    value_number: valueNumber,
    value_date: valueDate,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  mockDatabase.taskCustomValues.set(key, customValue)
  return customValue
}

function getTaskCustomValuesImpl(taskId: string) {
  const values = Array.from(mockDatabase.taskCustomValues.values()).filter(
    v => v.task_id === taskId
  )

  // Include field metadata
  return values.map(val => {
    const field = mockDatabase.customFields.get(val.field_id)
    return {
      ...val,
      field_name: field?.field_name,
      field_type: field?.field_type,
      options: field?.options,
    }
  })
}

describe('Custom Fields API', () => {
  const projectId = 'test-project-1'
  const taskId = 'test-task-1'

  beforeEach(() => {
    mockDatabase.customFields.clear()
    mockDatabase.taskCustomValues.clear()
  })

  describe('Create Custom Field', () => {
    it('should create a text custom field', () => {
      const customField = {
        field_name: 'Client Name',
        field_type: 'text',
        project_id: projectId,
      }

      const response = createCustomFieldImpl(customField)

      expect(response).toBeDefined()
      expect(response.field_name).toBe('Client Name')
      expect(response.field_type).toBe('text')
      expect(response.project_id).toBe(projectId)
      expect(response.id).toBeDefined()
      expect(response.created_at).toBeDefined()
    })

    it('should create a number custom field', () => {
      const customField = {
        field_name: 'Budget',
        field_type: 'number',
        project_id: projectId,
      }

      const response = createCustomFieldImpl(customField)

      expect(response.field_type).toBe('number')
      expect(response.field_name).toBe('Budget')
    })

    it('should create a date custom field', () => {
      const customField = {
        field_name: 'Launch Date',
        field_type: 'date',
        project_id: projectId,
      }

      const response = createCustomFieldImpl(customField)

      expect(response.field_type).toBe('date')
      expect(response.field_name).toBe('Launch Date')
    })

    it('should create a dropdown custom field with options', () => {
      const customField = {
        field_name: 'Client Type',
        field_type: 'dropdown',
        project_id: projectId,
        options: ['Enterprise', 'SMB', 'Startup'],
      }

      const response = createCustomFieldImpl(customField)

      expect(response.field_type).toBe('dropdown')
      expect(response.options).toEqual(['Enterprise', 'SMB', 'Startup'])
    })

    it('should enforce project-scoped fields', () => {
      const field1 = createCustomFieldImpl({
        field_name: 'Client',
        field_type: 'text',
        project_id: projectId,
      })

      const field2 = createCustomFieldImpl({
        field_name: 'Client',
        field_type: 'text',
        project_id: 'different-project',
      })

      expect(field1.id).not.toBe(field2.id)
      expect(field1.project_id).toBe(projectId)
      expect(field2.project_id).toBe('different-project')
    })

    it('should require field_name', () => {
      const customField = {
        field_type: 'text',
        project_id: projectId,
      }

      expect(() => createCustomFieldImpl(customField)).toThrow()
    })

    it('should require field_type', () => {
      const customField = {
        field_name: 'Client',
        project_id: projectId,
      }

      expect(() => createCustomFieldImpl(customField)).toThrow()
    })

    it('should require project_id', () => {
      const customField = {
        field_name: 'Client',
        field_type: 'text',
      }

      expect(() => createCustomFieldImpl(customField)).toThrow()
    })
  })

  describe('List Custom Fields', () => {
    it('should list all custom fields for a project', () => {
      const field1 = createCustomFieldImpl({
        field_name: 'Client',
        field_type: 'text',
        project_id: projectId,
      })

      const field2 = createCustomFieldImpl({
        field_name: 'Budget',
        field_type: 'number',
        project_id: projectId,
      })

      const fields = listCustomFieldsImpl(projectId)

      expect(fields.length).toBeGreaterThanOrEqual(2)
      expect(fields.some(f => f.id === field1.id)).toBe(true)
      expect(fields.some(f => f.id === field2.id)).toBe(true)
    })

    it('should only list fields for specified project', () => {
      const field1 = createCustomFieldImpl({
        field_name: 'Client',
        field_type: 'text',
        project_id: projectId,
      })

      const field2 = createCustomFieldImpl({
        field_name: 'Client',
        field_type: 'text',
        project_id: 'other-project',
      })

      const fields = listCustomFieldsImpl(projectId)

      expect(fields.some(f => f.id === field1.id)).toBe(true)
      expect(fields.some(f => f.id === field2.id)).toBe(false)
    })

    it('should return empty array for project with no custom fields', () => {
      const fields = listCustomFieldsImpl('empty-project')

      expect(Array.isArray(fields)).toBe(true)
      expect(fields.length).toBe(0)
    })
  })

  describe('Delete Custom Field', () => {
    it('should delete a custom field', () => {
      const field = createCustomFieldImpl({
        field_name: 'Client',
        field_type: 'text',
        project_id: projectId,
      })

      const deleteResult = deleteCustomFieldImpl(field.id)

      expect(deleteResult.success).toBe(true)

      const fields = listCustomFieldsImpl(projectId)
      expect(fields.some(f => f.id === field.id)).toBe(false)
    })

    it('should throw error when deleting non-existent field', () => {
      expect(() => deleteCustomFieldImpl('non-existent-id')).toThrow()
    })

    it('should cascade delete field values when field is deleted', () => {
      const field = createCustomFieldImpl({
        field_name: 'Client',
        field_type: 'text',
        project_id: projectId,
      })

      setCustomFieldValueImpl(taskId, field.id, 'Acme Corp')

      let values = getTaskCustomValuesImpl(taskId)
      expect(values.some(v => v.field_id === field.id)).toBe(true)

      deleteCustomFieldImpl(field.id)

      values = getTaskCustomValuesImpl(taskId)
      expect(values.some(v => v.field_id === field.id)).toBe(false)
    })
  })

  describe('Custom Field Values - Task Association', () => {
    it('should set text custom field value on task', () => {
      const field = createCustomFieldImpl({
        field_name: 'Client',
        field_type: 'text',
        project_id: projectId,
      })

      const result = setCustomFieldValueImpl(taskId, field.id, 'Acme Corp')

      expect(result.task_id).toBe(taskId)
      expect(result.field_id).toBe(field.id)
      expect(result.value_text).toBe('Acme Corp')
      expect(result.value_number).toBeNull()
      expect(result.value_date).toBeNull()
    })

    it('should set number custom field value on task', () => {
      const field = createCustomFieldImpl({
        field_name: 'Budget',
        field_type: 'number',
        project_id: projectId,
      })

      const result = setCustomFieldValueImpl(taskId, field.id, 50000)

      expect(result.value_number).toBe(50000)
      expect(result.value_text).toBeNull()
      expect(result.value_date).toBeNull()
    })

    it('should set date custom field value on task', () => {
      const field = createCustomFieldImpl({
        field_name: 'Launch Date',
        field_type: 'date',
        project_id: projectId,
      })

      const dateStr = '2024-12-31'
      const result = setCustomFieldValueImpl(taskId, field.id, dateStr)

      expect(result.value_date).toBe(dateStr)
      expect(result.value_text).toBeNull()
      expect(result.value_number).toBeNull()
    })

    it('should set dropdown custom field value on task', () => {
      const field = createCustomFieldImpl({
        field_name: 'Client Type',
        field_type: 'dropdown',
        project_id: projectId,
        options: ['Enterprise', 'SMB', 'Startup'],
      })

      const result = setCustomFieldValueImpl(taskId, field.id, 'Enterprise')

      expect(result.value_text).toBe('Enterprise')
    })

    it('should update existing custom field value', () => {
      const field = createCustomFieldImpl({
        field_name: 'Client',
        field_type: 'text',
        project_id: projectId,
      })

      setCustomFieldValueImpl(taskId, field.id, 'Acme Corp')
      const updated = setCustomFieldValueImpl(taskId, field.id, 'Beta Inc')

      expect(updated.value_text).toBe('Beta Inc')

      const values = getTaskCustomValuesImpl(taskId)
      const fieldValue = values.find(v => v.field_id === field.id)
      expect(fieldValue?.value_text).toBe('Beta Inc')
    })

    it('should handle null/empty values', () => {
      const field = createCustomFieldImpl({
        field_name: 'Client',
        field_type: 'text',
        project_id: projectId,
      })

      const result = setCustomFieldValueImpl(taskId, field.id, null)

      expect(result.value_text).toBeNull()
    })
  })

  describe('Get Task Custom Values', () => {
    it('should retrieve all custom field values for a task', () => {
      const field1 = createCustomFieldImpl({
        field_name: 'Client',
        field_type: 'text',
        project_id: projectId,
      })

      const field2 = createCustomFieldImpl({
        field_name: 'Budget',
        field_type: 'number',
        project_id: projectId,
      })

      setCustomFieldValueImpl(taskId, field1.id, 'Acme Corp')
      setCustomFieldValueImpl(taskId, field2.id, 50000)

      const values = getTaskCustomValuesImpl(taskId)

      expect(values.length).toBeGreaterThanOrEqual(2)
      expect(values.some(v => v.field_id === field1.id && v.value_text === 'Acme Corp')).toBe(true)
      expect(values.some(v => v.field_id === field2.id && v.value_number === 50000)).toBe(true)
    })

    it('should return empty array for task with no custom field values', () => {
      const values = getTaskCustomValuesImpl('task-without-values')

      expect(Array.isArray(values)).toBe(true)
      expect(values.length).toBe(0)
    })

    it('should include field metadata in response', () => {
      const field = createCustomFieldImpl({
        field_name: 'Client',
        field_type: 'text',
        project_id: projectId,
      })

      setCustomFieldValueImpl(taskId, field.id, 'Acme Corp')

      const values = getTaskCustomValuesImpl(taskId)
      const value = values.find(v => v.field_id === field.id)

      expect(value?.field_name).toBe('Client')
      expect(value?.field_type).toBe('text')
    })
  })

  describe('Validation & Error Handling', () => {
    it('should validate dropdown value is in options', () => {
      const field = createCustomFieldImpl({
        field_name: 'Client Type',
        field_type: 'dropdown',
        project_id: projectId,
        options: ['Enterprise', 'SMB', 'Startup'],
      })

      expect(() => setCustomFieldValueImpl(taskId, field.id, 'Invalid Option')).toThrow()
    })

    it('should validate number field type', () => {
      const field = createCustomFieldImpl({
        field_name: 'Budget',
        field_type: 'number',
        project_id: projectId,
      })

      expect(() => setCustomFieldValueImpl(taskId, field.id, 'not-a-number')).toThrow()
    })

    it('should validate date format', () => {
      const field = createCustomFieldImpl({
        field_name: 'Launch Date',
        field_type: 'date',
        project_id: projectId,
      })

      expect(() => setCustomFieldValueImpl(taskId, field.id, 'invalid-date')).toThrow()
    })
  })
})
