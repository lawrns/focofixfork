'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'

interface CustomField {
  id: string
  field_name: string
  field_type: 'text' | 'number' | 'date' | 'dropdown'
  options?: string[]
  created_at: string
}

interface CustomFieldValue {
  field_id: string
  value_text: string | null
  value_number: number | null
  value_date: string | null
}

interface CustomFieldInputsProps {
  projectId: string
  taskId?: string
  values?: CustomFieldValue[]
  onValuesChange?: (values: Record<string, any>) => void
}

export function CustomFieldInputs({
  projectId,
  taskId,
  values = [],
  onValuesChange,
}: CustomFieldInputsProps) {
  const [fields, setFields] = useState<CustomField[]>([])
  const [loading, setLoading] = useState(true)
  const [fieldValues, setFieldValues] = useState<Record<string, any>>({})

  // Fetch custom fields on mount
  useEffect(() => {
    fetchFields()
    if (taskId) {
      fetchTaskValues()
    }
  }, [projectId, taskId])

  // Initialize field values from props
  useEffect(() => {
    if (values.length > 0) {
      const initialValues: Record<string, any> = {}
      values.forEach(val => {
        initialValues[val.field_id] =
          val.value_text || val.value_number || val.value_date || null
      })
      setFieldValues(initialValues)
    }
  }, [values])

  async function fetchFields() {
    try {
      const response = await fetch(`/api/projects/${projectId}/custom-fields`)
      if (!response.ok) {
        throw new Error('Failed to fetch custom fields')
      }

      const result = await response.json()
      setFields(result.data || [])
    } catch (err) {
      console.error('Error fetching custom fields:', err)
    } finally {
      setLoading(false)
    }
  }

  async function fetchTaskValues() {
    if (!taskId) return

    try {
      const response = await fetch(`/api/tasks/${taskId}/custom-values`)
      if (!response.ok) {
        throw new Error('Failed to fetch task custom values')
      }

      const result = await response.json()
      const initialValues: Record<string, any> = {}
      result.data.forEach((val: any) => {
        initialValues[val.field_id] =
          val.value_text || val.value_number || val.value_date || null
      })
      setFieldValues(initialValues)
    } catch (err) {
      console.error('Error fetching task custom values:', err)
    }
  }

  function handleValueChange(fieldId: string, value: any) {
    const newValues = { ...fieldValues, [fieldId]: value }
    setFieldValues(newValues)
    onValuesChange?.(newValues)
  }

  if (loading) {
    return <div className="text-sm text-gray-500">Loading custom fields...</div>
  }

  if (fields.length === 0) {
    return null
  }

  return (
    <div className="space-y-4 border-t pt-4">
      <div className="text-sm font-semibold text-gray-700">Custom Fields</div>

      {fields.map(field => (
        <div key={field.id}>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {field.field_name}
          </label>

          {field.field_type === 'text' && (
            <Input
              type="text"
              placeholder={`Enter ${field.field_name.toLowerCase()}`}
              value={fieldValues[field.id] || ''}
              onChange={e => handleValueChange(field.id, e.target.value || null)}
            />
          )}

          {field.field_type === 'number' && (
            <Input
              type="number"
              placeholder={`Enter ${field.field_name.toLowerCase()}`}
              value={fieldValues[field.id] || ''}
              onChange={e =>
                handleValueChange(
                  field.id,
                  e.target.value ? Number(e.target.value) : null
                )
              }
            />
          )}

          {field.field_type === 'date' && (
            <Input
              type="date"
              value={fieldValues[field.id] || ''}
              onChange={e => handleValueChange(field.id, e.target.value || null)}
            />
          )}

          {field.field_type === 'dropdown' && (
            <select
              value={fieldValues[field.id] || ''}
              onChange={e => handleValueChange(field.id, e.target.value || null)}
              className="w-full px-3 py-2 border rounded bg-white"
            >
              <option value="">-- Select {field.field_name.toLowerCase()} --</option>
              {field.options?.map(option => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          )}
        </div>
      ))}
    </div>
  )
}
