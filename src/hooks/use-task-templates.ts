import { useState, useCallback, useEffect } from 'react'
import { apiClient } from '@/lib/api-client'
import { audioService } from '@/lib/audio/audio-service'
import { hapticService } from '@/lib/audio/haptic-service'

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
        const response = await apiClient.post('/api/task-templates', data)

        if (!response.success || !response.data) {
          audioService.play('error')
          hapticService.error()
          throw new Error(response.error || 'Failed to create template')
        }

        const result = response.data
        audioService.play('complete')
        hapticService.success()

        if (!result.queued) {
          setTemplates([...templates, result])
        } else {
          // Templates list might be out of sync if we just add it locally
          // but for UX we can add it with a 'queued' status if we had one
        }
        return result
      } catch (err: any) {
        audioService.play('error')
        hapticService.error()
        setError(err.message)
        throw err
      }
    },
    [templates]
  )

  const deleteTemplate = useCallback(
    async (id: string) => {
      try {
        const response = await apiClient.delete(`/api/task-templates/${id}`)

        if (!response.success) {
          audioService.play('error')
          hapticService.error()
          throw new Error(response.error || 'Failed to delete template')
        }

        audioService.play('error') // Use error sound for deletion
        hapticService.heavy()
        
        if (!response.data?.queued) {
          setTemplates(templates.filter(t => t.id !== id))
        }
      } catch (err: any) {
        audioService.play('error')
        hapticService.error()
        setError(err.message)
        throw err
      }
    },
    [templates]
  )

  const applyTemplate = useCallback(
    async (id: string, projectId: string, overrides?: Record<string, any>) => {
      try {
        const response = await apiClient.post(`/api/task-templates/${id}/apply`, { project_id: projectId, ...overrides })

        if (!response.success || !response.data) {
          audioService.play('error')
          hapticService.error()
          throw new Error(response.error || 'Failed to apply template')
        }

        audioService.play('complete')
        hapticService.success()
        return response.data
      } catch (err: any) {
        audioService.play('error')
        hapticService.error()
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
