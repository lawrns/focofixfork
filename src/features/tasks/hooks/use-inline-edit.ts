import { useState, useCallback, useRef, useEffect } from 'react'
import { Task, UpdateTaskData } from '../types'
import { toast } from 'sonner'

interface UseInlineEditOptions {
  onSave?: (fieldName: string, value: any) => Promise<void>
  onError?: (error: Error) => void
}

export function useInlineEdit(task: Task, options: UseInlineEditOptions = {}) {
  const { onSave, onError } = options

  const [editingField, setEditingField] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<any>(null)
  const [originalValue, setOriginalValue] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null)

  // Use refs to avoid dependency cycles
  const editingFieldRef = useRef<string | null>(null)
  const editValueRef = useRef<any>(null)

  // Keep refs in sync with state
  useEffect(() => {
    editingFieldRef.current = editingField
  }, [editingField])

  useEffect(() => {
    editValueRef.current = editValue
  }, [editValue])

  const startEditing = useCallback((fieldName: string, currentValue: any) => {
    setEditingField(fieldName)
    setEditValue(currentValue)
    setOriginalValue(currentValue)
    setError(null)
  }, [])

  const cancelEditing = useCallback(() => {
    setEditingField(null)
    setEditValue(null)
    setOriginalValue(null)
    setError(null)
  }, [])

  const validateField = useCallback((fieldName: string, value: any): { valid: boolean; error?: string } => {
    // Validate title is not empty
    if (fieldName === 'title') {
      if (!value || value.trim() === '') {
        return { valid: false, error: 'Title is required' }
      }
      if (value.trim().length > 255) {
        return { valid: false, error: 'Title must be less than 255 characters' }
      }
    }

    // Validate priority
    if (fieldName === 'priority') {
      const validPriorities = ['low', 'medium', 'high', 'urgent']
      if (!validPriorities.includes(value)) {
        return { valid: false, error: 'Invalid priority' }
      }
    }

    // Validate due date
    if (fieldName === 'due_date') {
      if (value && isNaN(new Date(value).getTime())) {
        return { valid: false, error: 'Invalid date' }
      }
    }

    return { valid: true }
  }, [])

  const saveChanges = useCallback(async (fieldName: string, value: any) => {
    // Validate the field
    const validation = validateField(fieldName, value)
    if (!validation.valid) {
      setError(validation.error || 'Validation failed')
      return false
    }

    // Skip if value hasn't changed
    if (value === originalValue) {
      setEditingField(null)
      setEditValue(null)
      setOriginalValue(null)
      setError(null)
      return true
    }

    setIsLoading(true)
    try {
      if (onSave) {
        await onSave(fieldName, value)
      }

      toast.success(`${fieldName} updated successfully`)
      setEditingField(null)
      setEditValue(null)
      setOriginalValue(null)
      setError(null)
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save changes'
      setError(errorMessage)
      setEditValue(originalValue) // Revert to original value
      onError?.(err instanceof Error ? err : new Error(errorMessage))
      toast.error(errorMessage)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [originalValue, validateField, onSave, onError])

  const handleKeyDown = useCallback(
    async (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        if (editingField) {
          await saveChanges(editingField, editValue)
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        cancelEditing()
      }
    },
    [editingField, editValue, saveChanges, cancelEditing]
  )

  const handleBlur = useCallback(async () => {
    // Use refs to get current values, avoiding stale closure
    const currentField = editingFieldRef.current
    const currentValue = editValueRef.current

    if (currentField) {
      await saveChanges(currentField, currentValue)
    }
  }, [saveChanges])

  // Auto-focus input when entering edit mode
  useEffect(() => {
    if (editingField && inputRef.current) {
      inputRef.current.focus()

      // Select all text for text inputs
      if (inputRef.current instanceof HTMLInputElement && inputRef.current.type === 'text') {
        inputRef.current.select()
      }
    }
  }, [editingField])

  return {
    editingField,
    editValue,
    isLoading,
    error,
    inputRef,
    startEditing,
    cancelEditing,
    saveChanges,
    handleKeyDown,
    handleBlur,
    setEditValue,
  }
}
