import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { Task } from '../types'

type BatchOperation = 'complete' | 'move' | 'priority' | 'assign' | 'tag' | 'delete'

interface BatchOperationState {
  tasks: Task[]
  operation: BatchOperation
  value?: any
}

interface BatchOperationResult {
  success: boolean
  data?: {
    operation: BatchOperation
    updated: number
    failed: number
    tasks: Task[]
  }
  error?: string
}

export function useBatchOperations() {
  const [isLoading, setIsLoading] = useState(false)
  const [undoState, setUndoState] = useState<BatchOperationState | null>(null)

  const performBatchOperation = useCallback(
    async (
      taskIds: string[],
      operation: BatchOperation,
      value?: any
    ): Promise<BatchOperationResult> => {
      if (!taskIds || taskIds.length === 0) {
        return { success: false, error: 'No tasks selected' }
      }

      setIsLoading(true)

      try {
        const response = await fetch('/api/tasks/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            taskIds,
            operation,
            value,
          }),
          credentials: 'include',
        })

        const result: BatchOperationResult = await response.json()

        if (!response.ok) {
          return {
            success: false,
            error: result.error || 'Batch operation failed',
          }
        }

        // Show success toast with undo option
        const taskCount = result.data?.updated || 0
        const operationLabel = getOperationLabel(operation)

        toast.success(`${taskCount} ${taskCount === 1 ? 'task' : 'tasks'} ${operationLabel}`, {
          action: {
            label: 'Undo',
            onClick: () => {
              // Undo logic will be handled by parent component
              toast.info('Undo requested')
            },
          },
        })

        return result
      } catch (error: any) {
        const errorMessage = error.message || 'Failed to perform batch operation'
        toast.error(errorMessage)
        return {
          success: false,
          error: errorMessage,
        }
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  const getOperationLabel = (operation: BatchOperation): string => {
    const labels: Record<BatchOperation, string> = {
      complete: 'marked as complete',
      move: 'moved',
      priority: 'priority updated',
      assign: 'assigned',
      tag: 'tagged',
      delete: 'deleted',
    }
    return labels[operation]
  }

  return {
    performBatchOperation,
    isLoading,
    undoState,
    setUndoState,
  }
}
