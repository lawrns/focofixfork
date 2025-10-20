'use client'

import { useState, useCallback, useMemo } from 'react'

export interface ValidationRule {
  required?: boolean
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  custom?: (value: string) => string | null
  email?: boolean
  url?: boolean
}

export interface ValidationState {
  isValid: boolean
  message?: string
  variant?: 'error' | 'success' | 'warning'
}

export function useFormValidation() {
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const validateField = useCallback((
    name: string,
    value: string,
    rules: ValidationRule
  ): ValidationState => {
    // Required validation
    if (rules.required && !value.trim()) {
      return {
        isValid: false,
        message: 'This field is required',
        variant: 'error'
      }
    }

    // Skip other validations if field is empty and not required
    if (!value.trim() && !rules.required) {
      return { isValid: true }
    }

    // Min length validation
    if (rules.minLength && value.length < rules.minLength) {
      return {
        isValid: false,
        message: `Must be at least ${rules.minLength} characters`,
        variant: 'error'
      }
    }

    // Max length validation
    if (rules.maxLength && value.length > rules.maxLength) {
      return {
        isValid: false,
        message: `Must be no more than ${rules.maxLength} characters`,
        variant: 'error'
      }
    }

    // Email validation
    if (rules.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(value)) {
        return {
          isValid: false,
          message: 'Please enter a valid email address',
          variant: 'error'
        }
      }
    }

    // URL validation
    if (rules.url) {
      try {
        new URL(value)
      } catch {
        return {
          isValid: false,
          message: 'Please enter a valid URL',
          variant: 'error'
        }
      }
    }

    // Pattern validation
    if (rules.pattern && !rules.pattern.test(value)) {
      return {
        isValid: false,
        message: 'Please enter a valid value',
        variant: 'error'
      }
    }

    // Custom validation
    if (rules.custom) {
      const customError = rules.custom(value)
      if (customError) {
        return {
          isValid: false,
          message: customError,
          variant: 'error'
        }
      }
    }

    return { isValid: true, variant: 'success' }
  }, [])

  const validateForm = useCallback((
    fields: Record<string, { value: string; rules: ValidationRule }>
  ): boolean => {
    const newErrors: Record<string, string> = {}
    let isValid = true

    Object.entries(fields).forEach(([name, { value, rules }]) => {
      const validation = validateField(name, value, rules)
      if (!validation.isValid) {
        newErrors[name] = validation.message || 'Invalid value'
        isValid = false
      }
    })

    setErrors(newErrors)
    return isValid
  }, [validateField])

  const validateFieldRealTime = useCallback((
    name: string,
    value: string,
    rules: ValidationRule
  ): ValidationState => {
    const validation = validateField(name, value, rules)
    
    if (validation.isValid) {
      setErrors(prev => {
        const { [name]: _, ...rest } = prev
        return rest
      })
    } else {
      setErrors(prev => ({
        ...prev,
        [name]: validation.message || 'Invalid value'
      }))
    }

    return validation
  }, [validateField])

  const markFieldTouched = useCallback((name: string) => {
    setTouched(prev => ({ ...prev, [name]: true }))
  }, [])

  const resetValidation = useCallback(() => {
    setErrors({})
    setTouched({})
  }, [])

  const getFieldError = useCallback((name: string): string | undefined => {
    return touched[name] ? errors[name] : undefined
  }, [errors, touched])

  const isFieldTouched = useCallback((name: string): boolean => {
    return touched[name] || false
  }, [touched])

  const isFormValid = useMemo(() => {
    return Object.keys(errors).length === 0
  }, [errors])

  return {
    validateField,
    validateForm,
    validateFieldRealTime,
    markFieldTouched,
    resetValidation,
    getFieldError,
    isFieldTouched,
    isFormValid,
    errors,
    touched
  }
}
