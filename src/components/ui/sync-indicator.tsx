'use client'

import { Check, AlertCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SyncStatus } from '@/lib/hooks/useSyncStatus'

export interface SyncIndicatorProps {
  status: SyncStatus
  errorMessage?: string | null
  className?: string
  compact?: boolean
  showLabel?: boolean
}

/**
 * Visual indicator for real-time data sync status
 * Shows spinner during sync, checkmark after completion, error warning on failure
 */
export function SyncIndicator({
  status,
  errorMessage,
  className,
  compact = false,
  showLabel = true,
}: SyncIndicatorProps) {
  if (status === 'idle') {
    return null
  }

  const isCompact = compact
  const iconSize = isCompact ? 'h-3 w-3' : 'h-4 w-4'

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5',
        isCompact && 'gap-1',
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={`Sync status: ${status}`}
    >
      {status === 'syncing' && (
        <>
          <Loader2
            className={cn('animate-spin text-blue-500', iconSize)}
            aria-hidden="true"
          />
          {showLabel && <span className="text-xs text-gray-600 dark:text-gray-400">Syncing...</span>}
        </>
      )}

      {status === 'synced' && (
        <>
          <Check
            className={cn('text-green-500', iconSize)}
            aria-hidden="true"
          />
          {showLabel && (
            <span className="text-xs text-gray-600 dark:text-gray-400">Synced</span>
          )}
        </>
      )}

      {status === 'error' && (
        <>
          <AlertCircle
            className={cn('text-red-500', iconSize)}
            aria-hidden="true"
          />
          {showLabel && (
            <span
              className="text-xs text-red-600 dark:text-red-400"
              title={errorMessage || 'Sync error'}
            >
              {errorMessage ? 'Sync error' : 'Error'}
            </span>
          )}
        </>
      )}
    </div>
  )
}

export function SyncBadge({
  status,
  errorMessage,
  className,
}: Omit<SyncIndicatorProps, 'showLabel' | 'compact'>) {
  if (status === 'idle') {
    return null
  }

  const badgeClass = {
    syncing: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    synced: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    error: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  }[status]

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 px-2 py-1 rounded-md text-xs font-medium',
        badgeClass,
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={`Sync status: ${status}`}
    >
      <SyncIndicator
        status={status}
        errorMessage={errorMessage}
        compact
        showLabel={false}
      />
      <span>
        {status === 'syncing' && 'Syncing...'}
        {status === 'synced' && 'Synced'}
        {status === 'error' && (errorMessage ? errorMessage : 'Sync error')}
      </span>
    </div>
  )
}
