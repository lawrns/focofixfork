'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { Progress } from '@/components/ui/progress'
import { CheckCircle2, AlertCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface FileUploadProgressProps {
  isUploading: boolean
  progress: number
  fileName: string
  isComplete?: boolean
  error?: string | null
  onCancel?: () => void
  currentSize?: string
  totalSize?: string
  className?: string
}

export const FileUploadProgress = React.forwardRef<
  HTMLDivElement,
  FileUploadProgressProps
>(
  (
    {
      isUploading,
      progress,
      fileName,
      isComplete = false,
      error = null,
      onCancel,
      currentSize,
      totalSize,
      className,
    },
    ref
  ) => {
    const hasError = error !== null && error !== undefined
    const showProgress = isUploading || (!isComplete && !hasError)

    return (
      <div
        ref={ref}
        className={cn(
          'w-full rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950',
          className
        )}
      >
        {/* Header with file info */}
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
              {fileName}
            </p>
          </div>
          {showProgress && onCancel && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="ml-2 h-6 w-6 p-0"
              aria-label="Cancel upload"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Progress bar - shown during upload or if not complete/error-free */}
        {showProgress && (
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between">
              <Progress
                value={progress}
                className="flex-1"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                role="progressbar"
              />
              <span className="ml-3 text-sm font-semibold text-zinc-600 dark:text-zinc-400">
                {progress}%
              </span>
            </div>

            {/* File size info if provided */}
            {currentSize && totalSize && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {currentSize} of {totalSize}
              </p>
            )}

            {/* Upload in progress indicator */}
            {isUploading && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Uploading...
              </p>
            )}
          </div>
        )}

        {/* Completion state */}
        {!hasError && isComplete && progress === 100 && (
          <div className="mt-2 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" data-testid="upload-success-icon" />
            <span className="text-sm text-green-600 dark:text-green-400">
              Upload complete
            </span>
          </div>
        )}

        {/* Error state */}
        {hasError && (
          <div className="mt-3 flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" data-testid="upload-error-icon" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-600 dark:text-red-400">
                Upload failed
              </p>
              <p className="text-xs text-red-500 dark:text-red-400">
                {error}
              </p>
            </div>
          </div>
        )}
      </div>
    )
  }
)

FileUploadProgress.displayName = 'FileUploadProgress'
