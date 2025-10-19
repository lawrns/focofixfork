'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

export interface InlineEditOptions {
  initialValue?: string
  onSave: (value: string) => Promise<void> | void
  onCancel?: () => void
  validate?: (value: string) => string | null
  debounceMs?: number
  selectOnFocus?: boolean
  autoFocus?: boolean
}

export interface InlineEditState {
  isEditing: boolean
  value: string
  error: string | null
  isLoading: boolean
}

export function useInlineEdit({
  initialValue = '',
  onSave,
  onCancel,
  validate,
  debounceMs = 500,
  selectOnFocus = true,
  autoFocus = false
}: InlineEditOptions) {
  const [state, setState] = useState<InlineEditState>({
    isEditing: false,
    value: initialValue,
    error: null,
    isLoading: false
  })

  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout>()

  // Auto-focus when editing starts
  useEffect(() => {
    if (state.isEditing && autoFocus && inputRef.current) {
      inputRef.current.focus()
      if (selectOnFocus) {
        inputRef.current.select()
      }
    }
  }, [state.isEditing, autoFocus, selectOnFocus])

  const startEditing = useCallback(() => {
    setState(prev => ({
      ...prev,
      isEditing: true,
      error: null
    }))
  }, [])

  const cancelEditing = useCallback(() => {
    setState(prev => ({
      ...prev,
      isEditing: false,
      value: initialValue,
      error: null
    }))
    onCancel?.()
  }, [initialValue, onCancel])

  const saveValue = useCallback(async (newValue: string) => {
    // Validate if validator provided
    if (validate) {
      const validationError = validate(newValue)
      if (validationError) {
        setState(prev => ({
          ...prev,
          error: validationError
        }))
        return
      }
    }

    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null
    }))

    try {
      await onSave(newValue)
      setState(prev => ({
        ...prev,
        isEditing: false,
        isLoading: false
      }))
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to save',
        isLoading: false
      }))
    }
  }, [onSave, validate])

  const debouncedSave = useCallback((newValue: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      saveValue(newValue)
    }, debounceMs)
  }, [saveValue, debounceMs])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!state.isEditing) return

    switch (e.key) {
      case 'Enter':
        e.preventDefault()
        if (e.ctrlKey || e.metaKey) {
          // Ctrl/Cmd+Enter saves immediately
          saveValue(state.value)
        } else {
          // Enter saves and exits
          saveValue(state.value)
        }
        break
      case 'Escape':
        e.preventDefault()
        cancelEditing()
        break
      case 'Tab':
        // Allow tab to save and move focus
        saveValue(state.value)
        break
    }
  }, [state.isEditing, state.value, saveValue, cancelEditing])

  const handleBlur = useCallback(() => {
    if (state.isEditing) {
      saveValue(state.value)
    }
  }, [state.isEditing, state.value, saveValue])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newValue = e.target.value
    setState(prev => ({
      ...prev,
      value: newValue,
      error: null
    }))

    // Auto-save with debounce
    debouncedSave(newValue)
  }, [debouncedSave])

  const updateValue = useCallback((newValue: string) => {
    setState(prev => ({
      ...prev,
      value: newValue
    }))
  }, [])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return {
    ...state,
    inputRef,
    startEditing,
    cancelEditing,
    saveValue,
    handleKeyDown,
    handleBlur,
    handleChange,
    updateValue
  }
}
