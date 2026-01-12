import { useCallback, useState } from 'react'
import {
  findSimilarTasks,
  type Task,
  type DuplicateMatch,
} from '../utils/duplicate-detection'

interface UseDuplicateDetectionOptions {
  threshold?: number
  enabled?: boolean
}

interface UseDuplicateDetectionReturn {
  duplicates: DuplicateMatch[]
  showDialog: boolean
  checkDuplicates: (title: string, projectId: string, tasks: Task[]) => boolean
  closeDuplicateDialog: () => void
  resetDuplicates: () => void
}

/**
 * Hook for managing duplicate task detection
 * Returns whether duplicates were found and controls the dialog state
 */
export function useDuplicateDetection({
  threshold = 0.9,
  enabled = true,
}: UseDuplicateDetectionOptions = {}): UseDuplicateDetectionReturn {
  const [duplicates, setDuplicates] = useState<DuplicateMatch[]>([])
  const [showDialog, setShowDialog] = useState(false)

  const checkDuplicates = useCallback(
    (title: string, projectId: string, tasks: Task[]): boolean => {
      if (!enabled || !title.trim() || !projectId) {
        return false
      }

      const foundDuplicates = findSimilarTasks(title, projectId, tasks, threshold)

      if (foundDuplicates.length > 0) {
        setDuplicates(foundDuplicates)
        setShowDialog(true)
        return true
      }

      return false
    },
    [enabled, threshold]
  )

  const closeDuplicateDialog = useCallback(() => {
    setShowDialog(false)
  }, [])

  const resetDuplicates = useCallback(() => {
    setDuplicates([])
    setShowDialog(false)
  }, [])

  return {
    duplicates,
    showDialog,
    checkDuplicates,
    closeDuplicateDialog,
    resetDuplicates,
  }
}
