'use client'

import { useState, useCallback, useEffect, useRef } from 'react'

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error'

export interface UseSyncStatusOptions {
  syncedResetMs?: number
  errorResetMs?: number
}

export interface UseSyncStatusReturn {
  syncStatus: SyncStatus
  isSyncing: boolean
  syncErrorMessage: string | null
  startSync: () => void
  completeSync: () => void
  setSyncError: (error: string) => void
  reset: () => void
}

/**
 * Hook for tracking real-time data sync status
 * Automatically resets synced and error states after configured durations
 */
export function useSyncStatus(options: UseSyncStatusOptions = {}): UseSyncStatusReturn {
  const { syncedResetMs = 2000, errorResetMs = 4000 } = options

  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Clear any pending timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const startSync = useCallback(() => {
    // Clear any pending timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }

    setSyncStatus('syncing')
    setErrorMessage(null)
  }, [])

  const completeSync = useCallback(() => {
    // Clear any pending timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    setSyncStatus('synced')
    setErrorMessage(null)

    // Auto-reset to idle after duration
    timeoutRef.current = setTimeout(() => {
      setSyncStatus('idle')
      timeoutRef.current = null
    }, syncedResetMs)
  }, [syncedResetMs])

  const syncErrorFn = useCallback(
    (error: string) => {
      // Clear any pending timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      setSyncStatus('error')
      setErrorMessage(error)

      // Auto-reset to idle after duration
      timeoutRef.current = setTimeout(() => {
        setSyncStatus('idle')
        setErrorMessage(null)
        timeoutRef.current = null
      }, errorResetMs)
    },
    [errorResetMs]
  )

  const reset = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }

    setSyncStatus('idle')
    setErrorMessage(null)
  }, [])

  return {
    syncStatus,
    isSyncing: syncStatus === 'syncing',
    syncErrorMessage: errorMessage,
    startSync,
    completeSync,
    setSyncError: syncErrorFn,
    reset,
  }
}
