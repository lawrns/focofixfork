import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useSyncStatus } from '../useSyncStatus'

describe('useSyncStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize with idle status', () => {
    const { result } = renderHook(() => useSyncStatus())

    expect(result.current.syncStatus).toBe('idle')
    expect(result.current.isSyncing).toBe(false)
    expect(result.current.syncErrorMessage).toBe(null)
  })

  it('should transition from idle to syncing when startSync is called', () => {
    const { result } = renderHook(() => useSyncStatus())

    act(() => {
      result.current.startSync()
    })

    expect(result.current.syncStatus).toBe('syncing')
    expect(result.current.isSyncing).toBe(true)
  })

  it('should transition from syncing to synced when completeSync is called', async () => {
    const { result } = renderHook(() => useSyncStatus())

    act(() => {
      result.current.startSync()
    })

    expect(result.current.syncStatus).toBe('syncing')

    act(() => {
      result.current.completeSync()
    })

    expect(result.current.syncStatus).toBe('synced')
    expect(result.current.isSyncing).toBe(false)
  })

  it('should show synced status briefly before returning to idle', async () => {
    const { result } = renderHook(() => useSyncStatus())

    act(() => {
      result.current.startSync()
    })

    act(() => {
      result.current.completeSync()
    })

    expect(result.current.syncStatus).toBe('synced')

    // Wait for auto-reset timeout (default 2000ms)
    await waitFor(
      () => {
        expect(result.current.syncStatus).toBe('idle')
      },
      { timeout: 2500 }
    )
  })

  it('should transition to error status when syncError is called', () => {
    const { result } = renderHook(() => useSyncStatus())

    const errorMsg = 'Sync failed'
    act(() => {
      result.current.setSyncError(errorMsg)
    })

    expect(result.current.syncStatus).toBe('error')
    expect(result.current.syncErrorMessage).toBe(errorMsg)
    expect(result.current.isSyncing).toBe(false)
  })

  it('should reset error after specified duration', async () => {
    const { result } = renderHook(() => useSyncStatus())

    act(() => {
      result.current.setSyncError('Connection lost')
    })

    expect(result.current.syncStatus).toBe('error')

    // Wait for auto-reset timeout (default 4000ms for errors)
    await waitFor(
      () => {
        expect(result.current.syncStatus).toBe('idle')
        expect(result.current.syncErrorMessage).toBe(null)
      },
      { timeout: 4500 }
    )
  })

  it('should allow manual reset', () => {
    const { result } = renderHook(() => useSyncStatus())

    act(() => {
      result.current.startSync()
    })

    act(() => {
      result.current.reset()
    })

    expect(result.current.syncStatus).toBe('idle')
    expect(result.current.isSyncing).toBe(false)
    expect(result.current.syncErrorMessage).toBe(null)
  })

  it('should support custom reset durations', async () => {
    const { result } = renderHook(() => useSyncStatus({ syncedResetMs: 500 }))

    act(() => {
      result.current.startSync()
    })

    act(() => {
      result.current.completeSync()
    })

    expect(result.current.syncStatus).toBe('synced')

    // Wait for faster custom reset timeout (500ms)
    await waitFor(
      () => {
        expect(result.current.syncStatus).toBe('idle')
      },
      { timeout: 1000 }
    )
  })

  it('should support custom error reset duration', async () => {
    const { result } = renderHook(() => useSyncStatus({ errorResetMs: 1000 }))

    act(() => {
      result.current.setSyncError('Test error')
    })

    expect(result.current.syncStatus).toBe('error')

    // Wait for faster custom reset timeout (1000ms)
    await waitFor(
      () => {
        expect(result.current.syncStatus).toBe('idle')
      },
      { timeout: 1500 }
    )
  })

  it('should handle multiple rapid sync operations', () => {
    const { result } = renderHook(() => useSyncStatus())

    act(() => {
      result.current.startSync()
      result.current.startSync() // Call again while syncing
      result.current.startSync() // And again
    })

    // Should still be in syncing state
    expect(result.current.syncStatus).toBe('syncing')
    expect(result.current.isSyncing).toBe(true)

    act(() => {
      result.current.completeSync()
    })

    expect(result.current.syncStatus).toBe('synced')
  })

  it('should clear error when sync completes', () => {
    const { result } = renderHook(() => useSyncStatus())

    act(() => {
      result.current.setSyncError('Initial error')
    })

    expect(result.current.syncStatus).toBe('error')
    expect(result.current.syncErrorMessage).toBe('Initial error')

    act(() => {
      result.current.startSync()
    })

    expect(result.current.syncStatus).toBe('syncing')

    act(() => {
      result.current.completeSync()
    })

    expect(result.current.syncStatus).toBe('synced')
    expect(result.current.syncErrorMessage).toBe(null)
  })
})
