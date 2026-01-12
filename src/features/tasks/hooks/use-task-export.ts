import { useCallback, useState } from 'react'
import { toast } from 'sonner'

export interface ExportOptions {
  format: 'csv' | 'json'
  projectId: string
  projectName: string
  filters?: {
    status?: string
    priority?: string
    assigneeId?: string
  }
}

export function useTaskExport() {
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const exportTasks = useCallback(async (options: ExportOptions) => {
    try {
      setIsExporting(true)
      setError(null)

      // Build query parameters
      const params = new URLSearchParams()
      params.append('format', options.format)
      params.append('project_id', options.projectId)

      if (options.filters?.status) {
        params.append('status', options.filters.status)
      }
      if (options.filters?.priority) {
        params.append('priority', options.filters.priority)
      }
      if (options.filters?.assigneeId) {
        params.append('assignee_id', options.filters.assigneeId)
      }

      const response = await fetch(`/api/tasks/export?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
      })

      if (!response.ok) {
        const errorBody = await response.text()
        throw new Error(`Export failed: ${response.status} - ${errorBody}`)
      }

      // Get content type from response header
      const contentType = response.headers.get('content-type')
      const blob = new Blob([await response.text()], { type: contentType || 'text/plain' })

      // Extract filename from content-disposition header
      const contentDisposition = response.headers.get('content-disposition')
      let filename = `tasks-${options.projectName}.${options.format}`
      if (contentDisposition) {
        const matches = contentDisposition.match(/filename="([^"]+)"/)
        if (matches && matches[1]) {
          filename = matches[1]
        }
      }

      // Trigger download
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success(`Tasks exported as ${options.format.toUpperCase()}`)
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to export tasks'
      setError(errorMessage)
      toast.error(errorMessage)
      console.error('[TaskExport] Error:', err)
    } finally {
      setIsExporting(false)
    }
  }, [])

  return {
    exportTasks,
    isExporting,
    error,
  }
}
