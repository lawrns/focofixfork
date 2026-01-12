'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Trash2, Plus } from 'lucide-react'

interface CustomField {
  id: string
  field_name: string
  field_type: 'text' | 'number' | 'date' | 'dropdown'
  options?: string[]
  created_at: string
}

interface CustomFieldsManagerProps {
  projectId: string
}

export function CustomFieldsManager({ projectId }: CustomFieldsManagerProps) {
  const [fields, setFields] = useState<CustomField[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newField, setNewField] = useState<{
    field_name: string;
    field_type: 'text' | 'number' | 'date' | 'dropdown';
    options: string;
  }>({
    field_name: '',
    field_type: 'text',
    options: '',
  })
  const [isAdding, setIsAdding] = useState(false)

  const fetchFields = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/projects/${projectId}/custom-fields`)
      if (!response.ok) {
        throw new Error('Failed to fetch custom fields')
      }

      const result = await response.json()
      setFields(result.data || [])
    } catch (err) {
      console.error('Error fetching custom fields:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchFields()
  }, [fetchFields])

  const handleAddField = useCallback(async () => {
    if (!newField.field_name.trim()) {
      setError('Field name is required')
      return
    }

    try {
      setError(null)
      const payload: any = {
        field_name: newField.field_name,
        field_type: newField.field_type,
      }

      if (newField.field_type === 'dropdown') {
        const options = newField.options
          .split(',')
          .map(opt => opt.trim())
          .filter(opt => opt)

        if (options.length === 0) {
          setError('At least one option is required for dropdown fields')
          return
        }

        payload.options = options
      }

      const response = await fetch(`/api/projects/${projectId}/custom-fields`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to create field')
      }

      const result = await response.json()
      setFields([...fields, result.data])
      setNewField({ field_name: '', field_type: 'text', options: '' })
      setIsAdding(false)
    } catch (err) {
      console.error('Error creating field:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }, [newField, projectId, fields])

  const handleDeleteField = useCallback(async (fieldId: string) => {
    if (!confirm('Are you sure you want to delete this field? All associated values will be removed.')) {
      return
    }

    try {
      setError(null)

      const response = await fetch(`/api/custom-fields/${fieldId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete field')
      }

      setFields(fields.filter(f => f.id !== fieldId))
    } catch (err) {
      console.error('Error deleting field:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }, [fields])

  if (loading) {
    return <div className="text-sm text-gray-500">Loading custom fields...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Custom Fields</h3>
        <p className="text-sm text-gray-600 mb-4">
          Add custom fields to enhance your tasks with additional metadata
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Existing Fields */}
        {fields.length > 0 && (
          <div className="mb-6 space-y-2">
            {fields.map(field => (
              <div
                key={field.id}
                className="flex items-center justify-between p-3 border rounded bg-gray-50 hover:bg-gray-100 transition"
              >
                <div className="flex-1">
                  <div className="font-medium text-sm">{field.field_name}</div>
                  <div className="text-xs text-gray-500 capitalize">
                    {field.field_type}
                    {field.options && ` (${field.options.length} options)`}
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteField(field.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded transition"
                  title="Delete field"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add New Field Form */}
        {isAdding ? (
          <div className="border rounded p-4 space-y-4 bg-blue-50">
            <div>
              <label className="block text-sm font-medium mb-1">Field Name</label>
              <Input
                placeholder="e.g., Client Name, Budget, Launch Date"
                value={newField.field_name}
                onChange={e => setNewField({ ...newField, field_name: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Field Type</label>
              <select
                value={newField.field_type}
                onChange={e =>
                  setNewField({
                    ...newField,
                    field_type: e.target.value as any,
                  })
                }
                className="w-full px-3 py-2 border rounded bg-white"
              >
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="date">Date</option>
                <option value="dropdown">Dropdown</option>
              </select>
            </div>

            {newField.field_type === 'dropdown' && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  Options (comma-separated)
                </label>
                <Input
                  placeholder="e.g., Option 1, Option 2, Option 3"
                  value={newField.options}
                  onChange={e => setNewField({ ...newField, options: e.target.value })}
                />
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleAddField}
                className="flex-1"
              >
                Create Field
              </Button>
              <Button
                onClick={() => {
                  setIsAdding(false)
                  setNewField({ field_name: '', field_type: 'text', options: '' })
                }}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button
            onClick={() => setIsAdding(true)}
            variant="outline"
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Custom Field
          </Button>
        )}
      </div>
    </div>
  )
}
