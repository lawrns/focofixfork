import { useState, useCallback, useEffect } from 'react'
import { toast } from 'sonner'

interface Subtask {
  id: string
  task_id: string
  title: string
  completed: boolean
  order: number
  position?: number
  created_at: string
  updated_at: string
}

interface UseSubtasksProps {
  taskId: string
}

interface UseSubtasksReturn {
  subtasks: Subtask[]
  isLoading: boolean
  error: string | null
  addSubtask: (title: string) => Promise<void>
  toggleSubtask: (subtaskId: string, completed: boolean) => Promise<void>
  deleteSubtask: (subtaskId: string) => Promise<void>
  reorderSubtasks: (subtasks: Subtask[]) => Promise<void>
  refreshSubtasks: () => Promise<void>
}

export function useSubtasks({ taskId }: UseSubtasksProps): UseSubtasksReturn {
  const [subtasks, setSubtasks] = useState<Subtask[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSubtasks = useCallback(async () => {
    if (!taskId) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/tasks/${taskId}/subtasks`)

      if (!response.ok) {
        throw new Error('Failed to fetch subtasks')
      }

      const result = await response.json()

      if (result.success) {
        setSubtasks(result.data || [])
      } else {
        throw new Error(result.error || 'Failed to fetch subtasks')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      console.error('Fetch subtasks error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [taskId])

  useEffect(() => {
    fetchSubtasks()
  }, [fetchSubtasks])

  const addSubtask = useCallback(
    async (title: string) => {
      try {
        const response = await fetch(`/api/tasks/${taskId}/subtasks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to add subtask')
        }

        const result = await response.json()

        if (result.success) {
          setSubtasks([...subtasks, result.data])
          toast.success('Subtask added')
        } else {
          throw new Error(result.error || 'Failed to add subtask')
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to add subtask'
        toast.error(message)
        throw err
      }
    },
    [taskId, subtasks]
  )

  const toggleSubtask = useCallback(
    async (subtaskId: string, completed: boolean) => {
      try {
        const response = await fetch(
          `/api/tasks/${taskId}/subtasks/${subtaskId}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ completed }),
          }
        )

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to update subtask')
        }

        const result = await response.json()

        if (result.success) {
          setSubtasks(
            subtasks.map((s) =>
              s.id === subtaskId ? { ...s, completed } : s
            )
          )
        } else {
          throw new Error(result.error || 'Failed to update subtask')
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update subtask'
        toast.error(message)
        throw err
      }
    },
    [taskId, subtasks]
  )

  const deleteSubtask = useCallback(
    async (subtaskId: string) => {
      try {
        const response = await fetch(
          `/api/tasks/${taskId}/subtasks/${subtaskId}`,
          {
            method: 'DELETE',
          }
        )

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to delete subtask')
        }

        const result = await response.json()

        if (result.success) {
          setSubtasks(subtasks.filter((s) => s.id !== subtaskId))
          toast.success('Subtask deleted')
        } else {
          throw new Error(result.error || 'Failed to delete subtask')
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete subtask'
        toast.error(message)
        throw err
      }
    },
    [taskId, subtasks]
  )

  const reorderSubtasks = useCallback(
    async (reorderedSubtasks: Subtask[]) => {
      try {
        const updatePromises = reorderedSubtasks.map((s) =>
          fetch(`/api/tasks/${taskId}/subtasks/${s.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ position: s.position }),
          })
        )

        const responses = await Promise.all(updatePromises)

        const allSuccess = responses.every((r) => r.ok)

        if (allSuccess) {
          setSubtasks(reorderedSubtasks)
          toast.success('Subtasks reordered')
        } else {
          throw new Error('Failed to reorder some subtasks')
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to reorder subtasks'
        toast.error(message)
        throw err
      }
    },
    [taskId]
  )

  return {
    subtasks,
    isLoading,
    error,
    addSubtask,
    toggleSubtask,
    deleteSubtask,
    reorderSubtasks,
    refreshSubtasks: fetchSubtasks,
  }
}
