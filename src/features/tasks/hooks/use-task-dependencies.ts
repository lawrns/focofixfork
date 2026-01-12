/**
 * Hook for managing task dependencies with validation
 */

import { useState, useCallback } from 'react'
import {
  canCreateDependency,
  type Dependency,
  type ValidationResult,
} from '../validation/task-dependency-validation'

export interface TaskDependency extends Dependency {
  id?: string
  created_at?: string
}

export interface UseDependenciesReturn {
  dependencies: TaskDependency[]
  addDependency: (taskId: string, dependsOnId: string) => ValidationResult
  removeDependency: (taskId: string, dependsOnId: string) => void
  validateDependency: (taskId: string, dependsOnId: string) => ValidationResult
  getDependencyError: (taskId: string, dependsOnId: string) => string | undefined
  hasError: boolean
  errorMessage: string | null
}

export function useTaskDependencies(
  initialDependencies: TaskDependency[] = []
): UseDependenciesReturn {
  const [dependencies, setDependencies] = useState<TaskDependency[]>(initialDependencies)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const validateDependency = useCallback(
    (taskId: string, dependsOnId: string): ValidationResult => {
      const result = canCreateDependency(taskId, dependsOnId, dependencies)
      return result
    },
    [dependencies]
  )

  const addDependency = useCallback(
    (taskId: string, dependsOnId: string): ValidationResult => {
      const result = validateDependency(taskId, dependsOnId)

      if (!result.valid) {
        setErrorMessage(result.error || 'Invalid dependency')
        return result
      }

      const newDependency: TaskDependency = {
        work_item_id: taskId,
        depends_on_id: dependsOnId,
      }

      setDependencies(prev => [...prev, newDependency])
      setErrorMessage(null)

      return { valid: true }
    },
    [validateDependency]
  )

  const removeDependency = useCallback((taskId: string, dependsOnId: string) => {
    setDependencies(prev =>
      prev.filter(
        dep => !(dep.work_item_id === taskId && dep.depends_on_id === dependsOnId)
      )
    )
    setErrorMessage(null)
  }, [])

  const getDependencyError = useCallback(
    (taskId: string, dependsOnId: string): string | undefined => {
      const result = validateDependency(taskId, dependsOnId)
      return result.error
    },
    [validateDependency]
  )

  return {
    dependencies,
    addDependency,
    removeDependency,
    validateDependency,
    getDependencyError,
    hasError: errorMessage !== null,
    errorMessage,
  }
}
