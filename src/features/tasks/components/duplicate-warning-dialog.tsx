'use client'

import { useCallback } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'
import type { DuplicateMatch } from '../utils/duplicate-detection'

interface DuplicateWarningDialogProps {
  isOpen: boolean
  title: string
  duplicates: DuplicateMatch[]
  onCreateAnyway: () => void
  onCancel: () => void
  onViewExisting?: (taskId: string) => void
}

export function DuplicateWarningDialog({
  isOpen,
  title,
  duplicates,
  onCreateAnyway,
  onCancel,
  onViewExisting,
}: DuplicateWarningDialogProps) {
  const formatSimilarity = useCallback((similarity: number) => {
    return Math.round(similarity * 100)
  }, [])

  if (!isOpen || duplicates.length === 0) {
    return null
  }

  const similarityPercentages = duplicates.map((dup) =>
    formatSimilarity(dup.similarity)
  )
  const maxSimilarity = Math.max(...similarityPercentages)

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500" />
            <AlertDialogTitle>Possible Duplicate Task</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-4 pt-2">
            <div>
              <p className="font-medium text-foreground mb-2">
                A similar task already exists in this project:
              </p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {duplicates.map((duplicate, index) => (
                  <div
                    key={duplicate.task.id}
                    className="p-3 bg-accent rounded-lg border border-border"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {duplicate.task.title}
                        </p>
                      </div>
                      <span className="flex-shrink-0 text-xs font-semibold px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded whitespace-nowrap">
                        {formatSimilarity(duplicate.similarity)}% match
                      </span>
                    </div>
                    {onViewExisting && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="mt-2 h-auto py-1 text-xs"
                        onClick={() => onViewExisting(duplicate.task.id)}
                      >
                        View Task
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              This check is specific to your current project and based on title
              similarity.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="flex flex-col-reverse gap-2 sm:flex-row">
          <AlertDialogCancel onClick={onCancel}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction onClick={onCreateAnyway}>
            Create Anyway
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
