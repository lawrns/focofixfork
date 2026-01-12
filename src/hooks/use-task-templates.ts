import { useState, useCallback, useEffect } from 'react'

export interface TaskTemplate {
  id: string
  user_id: string
  name: string
  title_template: string
  description_template: string | null
  tags: string[] | null
  priority: string
  created_at: string
  updated_at: string
}

interface UseTaskTemplatesReturn {
  templates: TaskTemplate[]
  loading: boolean
  error: string | null
  createTemplate: (data: Omit<TaskTemplate, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<TaskTemplate>
  deleteTemplate: (id: string) => Promise<void>
  applyTemplate: (id: string, projectId: string, overrides?: Record<string, any>) => Promise<any>
  refreshTemplates: () => Promise<void>
}

export function useTaskTemplates(): UseTaskTemplatesReturn {
  const [templates, setTemplates] = useState<TaskTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refreshTemplates = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/task-templates')
      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch templates')
      }

      setTemplates(result.data.templates)
      setError(null)
    } catch (err: any) {
      setError(err.message)
      console.error('Error fetching templates:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const createTemplate = useCallback(
    async (data: Omit<TaskTemplate, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      try {
        const response = await fetch('/api/task-templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        })

        const result = await response.json()

        if (!result.success) {
          throw new Error(result.error || 'Failed to create template')
        }

        setTemplates([...templates, result.data])
        return result.data
      } catch (err: any) {
        setError(err.message)
        throw err
      }
    },
    [templates]
  )

  const deleteTemplate = useCallback(
    async (id: string) => {
      try {
        const response = await fetch(`/api/task-templates/${id}`, {
          method: 'DELETE'
        })

        const result = await response.json()

        if (!result.success) {
          throw new Error(result.error || 'Failed to delete template')
        }

        setTemplates(templates.filter(t => t.id !== id))
      } catch (err: any) {
        setError(err.message)
        throw err
      }
    },
    [templates]
  )

  const applyTemplate = useCallback(
    async (id: string, projectId: string, overrides?: Record<string, any>) => {
      try {
        const response = await fetch(`/api/task-templates/${id}/apply`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ project_id: projectId, ...overrides })
        })

        const result = await response.json()

        if (!result.success) {
          throw new Error(result.error || 'Failed to apply template')
        }

        return result.data
      } catch (err: any) {
        setError(err.message)
        throw err
      }
    },
    []
  )

  useEffect(() => {
    refreshTemplates()
  }, [refreshTemplates])

  return {
    templates,
    loading,
    error,
    createTemplate,
    deleteTemplate,
    applyTemplate,
    refreshTemplates
  }
}
