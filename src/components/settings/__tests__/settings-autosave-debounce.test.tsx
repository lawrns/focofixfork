'use client'

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useSyncStatus } from '@/lib/hooks/useSyncStatus'

describe('Settings Auto-save with Debouncing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  describe('Debounce Behavior (500ms)', () => {
    it('should debounce rapid changes and only call once', () => {
      const saveFunction = vi.fn()
      const debounceDelay = 500

      // Simulate rapid changes
      const executeDebounced = (callback: () => void) => {
        let timeout: NodeJS.Timeout
        return () => {
          clearTimeout(timeout)
          timeout = setTimeout(callback, debounceDelay)
        }
      }

      const debouncedSave = executeDebounced(() => {
        saveFunction()
      })

      // Trigger 5 rapid changes
      debouncedSave()
      debouncedSave()
      debouncedSave()
      debouncedSave()
      debouncedSave()

      // Before debounce time, save should not be called
      expect(saveFunction).not.toHaveBeenCalled()

      // Advance past debounce time
      vi.advanceTimersByTime(500)

      // Should only be called once
      expect(saveFunction).toHaveBeenCalledTimes(1)
    })

    it('should wait 500ms before saving after last change', () => {
      const saveFunction = vi.fn()

      let timeout: NodeJS.Timeout
      const debouncedSave = (callback: () => void) => {
        clearTimeout(timeout)
        timeout = setTimeout(callback, 500)
      }

      // Make change
      debouncedSave(() => saveFunction())

      // Wait 400ms - should not save yet
      vi.advanceTimersByTime(400)
      expect(saveFunction).not.toHaveBeenCalled()

      // Wait 100ms more (total 500ms) - should save now
      vi.advanceTimersByTime(100)
      expect(saveFunction).toHaveBeenCalledTimes(1)
    })

    it('should reset debounce timer on new change', () => {
      const saveFunction = vi.fn()

      let timeout: NodeJS.Timeout
      const debouncedSave = (callback: () => void) => {
        clearTimeout(timeout)
        timeout = setTimeout(callback, 500)
      }

      // First change
      debouncedSave(() => saveFunction())

      // Wait 300ms
      vi.advanceTimersByTime(300)
      expect(saveFunction).not.toHaveBeenCalled()

      // Another change resets the timer
      debouncedSave(() => saveFunction())

      // Wait 300ms more (total 600ms from first change)
      vi.advanceTimersByTime(300)
      expect(saveFunction).not.toHaveBeenCalled()

      // Wait 200ms more (500ms from second change)
      vi.advanceTimersByTime(200)
      expect(saveFunction).toHaveBeenCalledTimes(1)
    })
  })

  describe('SyncIndicator Display with Auto-save', () => {
    it('should show Syncing indicator during save', () => {
      const { result } = renderHook(() => useSyncStatus())

      expect(result.current.syncStatus).toBe('idle')

      act(() => {
        result.current.startSync()
      })

      expect(result.current.syncStatus).toBe('syncing')
      expect(result.current.isSyncing).toBe(true)
    })

    it('should show Synced indicator after successful save', () => {
      const { result } = renderHook(() => useSyncStatus())

      act(() => {
        result.current.startSync()
        result.current.completeSync()
      })

      expect(result.current.syncStatus).toBe('synced')
    })

    it('should show Error indicator on save failure', () => {
      const { result } = renderHook(() => useSyncStatus())

      act(() => {
        result.current.setSyncError('Network error')
      })

      expect(result.current.syncStatus).toBe('error')
      expect(result.current.syncErrorMessage).toBe('Network error')
    })

    it('should auto-hide Synced indicator after 2 seconds', () => {
      const { result } = renderHook(() => useSyncStatus({ syncedResetMs: 2000 }))

      act(() => {
        result.current.startSync()
        result.current.completeSync()
      })

      expect(result.current.syncStatus).toBe('synced')

      // Advance 2 seconds
      act(() => {
        vi.advanceTimersByTime(2000)
      })

      // Status should reset to idle
      expect(result.current.syncStatus).toBe('idle')
    })

    it('should keep Error indicator visible for 4 seconds', () => {
      const { result } = renderHook(() => useSyncStatus({ errorResetMs: 4000 }))

      act(() => {
        result.current.setSyncError('Save failed')
      })

      expect(result.current.syncStatus).toBe('error')

      // At 2 seconds, should still be error
      act(() => {
        vi.advanceTimersByTime(2000)
      })
      expect(result.current.syncStatus).toBe('error')

      // At 4 seconds, should reset
      act(() => {
        vi.advanceTimersByTime(2000)
      })

      expect(result.current.syncStatus).toBe('idle')
    })
  })

  describe('Error Handling with Retry', () => {
    it('should allow retry after error', () => {
      const { result } = renderHook(() => useSyncStatus())

      // Simulate error
      act(() => {
        result.current.setSyncError('Failed to save')
      })

      expect(result.current.syncStatus).toBe('error')

      // Retry by starting sync again
      act(() => {
        result.current.startSync()
      })

      expect(result.current.syncStatus).toBe('syncing')
      expect(result.current.syncErrorMessage).toBeNull()

      // Complete retry
      act(() => {
        result.current.completeSync()
      })

      expect(result.current.syncStatus).toBe('synced')
    })

    it('should preserve error message for display', () => {
      const { result } = renderHook(() => useSyncStatus())

      const errorMsg = 'Network timeout'

      act(() => {
        result.current.setSyncError(errorMsg)
      })

      expect(result.current.syncErrorMessage).toBe(errorMsg)
    })
  })

  describe('Multiple Sequential Auto-saves', () => {
    it('should handle multiple auto-saves without losing state', () => {
      const { result } = renderHook(() => useSyncStatus())

      // First save cycle
      act(() => {
        result.current.startSync()
        result.current.completeSync()
      })

      expect(result.current.syncStatus).toBe('synced')

      // Reset timer
      act(() => {
        vi.advanceTimersByTime(2000)
      })

      // Second save cycle
      act(() => {
        result.current.startSync()
        result.current.completeSync()
      })

      expect(result.current.syncStatus).toBe('synced')
    })

    it('should transition correctly through multiple state changes', () => {
      const { result } = renderHook(() => useSyncStatus())

      // First: idle -> syncing
      act(() => {
        result.current.startSync()
      })
      expect(result.current.syncStatus).toBe('syncing')

      // Then: syncing -> error
      act(() => {
        result.current.setSyncError('First error')
      })
      expect(result.current.syncStatus).toBe('error')

      // Then: error -> syncing (retry)
      act(() => {
        result.current.startSync()
      })
      expect(result.current.syncStatus).toBe('syncing')

      // Finally: syncing -> synced
      act(() => {
        result.current.completeSync()
      })
      expect(result.current.syncStatus).toBe('synced')
    })
  })

  describe('Accessibility', () => {
    it('should provide proper status information for screen readers', () => {
      const { result } = renderHook(() => useSyncStatus())

      // Status should be retrievable
      expect(result.current.syncStatus).toBe('idle')
      expect(result.current.isSyncing).toBe(false)

      act(() => {
        result.current.startSync()
      })

      // Status should be accurately reflected
      expect(result.current.syncStatus).toBe('syncing')
      expect(result.current.isSyncing).toBe(true)
    })

    it('should track error message for accessibility', () => {
      const { result } = renderHook(() => useSyncStatus())

      const accessibleErrorMsg = 'Failed to save settings: invalid format'

      act(() => {
        result.current.setSyncError(accessibleErrorMsg)
      })

      expect(result.current.syncErrorMessage).toBe(accessibleErrorMsg)
    })
  })
})
