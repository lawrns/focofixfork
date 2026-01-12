import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useApiRateLimit } from '../use-api-rate-limit'

describe('useApiRateLimit Hook', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should initialize with no retry state', () => {
    const { result } = renderHook(() => useApiRateLimit())

    expect(result.current.isRetrying).toBe(false)
    expect(result.current.countdown).toBe(0)
    expect(result.current.attempt).toBe(0)
  })

  it('should start retry countdown when handleRetry is called', () => {
    const { result } = renderHook(() => useApiRateLimit())

    act(() => {
      result.current.handleRetry(1, 3000)
    })

    expect(result.current.isRetrying).toBe(true)
    expect(result.current.attempt).toBe(1)
    expect(result.current.countdown).toBe(3)
  })

  it('should decrease countdown over time', () => {
    const { result } = renderHook(() => useApiRateLimit())

    act(() => {
      result.current.handleRetry(1, 3000)
    })

    expect(result.current.countdown).toBe(3)

    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(result.current.countdown).toBe(2)

    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(result.current.countdown).toBe(1)

    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(result.current.countdown).toBe(0)
    expect(result.current.isRetrying).toBe(false)
  })

  it('should generate correct user message during retry', () => {
    const { result } = renderHook(() => useApiRateLimit())

    act(() => {
      result.current.handleRetry(1, 2000)
    })

    let message = result.current.getMessage()
    expect(message).toContain('Too many requests')
    expect(message).toContain('2 seconds')
    expect(message).toContain('attempt 1')

    act(() => {
      vi.advanceTimersByTime(1000)
    })

    message = result.current.getMessage()
    expect(message).toContain('1 second')
  })

  it('should generate correct message for singular second', () => {
    const { result } = renderHook(() => useApiRateLimit())

    act(() => {
      result.current.handleRetry(1, 1500)
    })

    act(() => {
      vi.advanceTimersByTime(500)
    })

    const message = result.current.getMessage()
    expect(message).toContain('1 second')
  })

  it('should return empty message when not retrying', () => {
    const { result } = renderHook(() => useApiRateLimit())

    expect(result.current.getMessage()).toBe('')
  })

  it('should reset retry state', () => {
    const { result } = renderHook(() => useApiRateLimit())

    act(() => {
      result.current.handleRetry(2, 5000)
    })

    expect(result.current.isRetrying).toBe(true)

    act(() => {
      result.current.reset()
    })

    expect(result.current.isRetrying).toBe(false)
    expect(result.current.countdown).toBe(0)
    expect(result.current.attempt).toBe(0)
  })

  it('should handle multiple retries sequentially', () => {
    const { result } = renderHook(() => useApiRateLimit())

    // First retry
    act(() => {
      result.current.handleRetry(1, 1000)
    })

    expect(result.current.attempt).toBe(1)

    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(result.current.isRetrying).toBe(false)

    // Second retry
    act(() => {
      result.current.handleRetry(2, 2000)
    })

    expect(result.current.attempt).toBe(2)
    expect(result.current.countdown).toBe(2)
  })

  it('should clear previous interval when starting new retry', () => {
    const { result } = renderHook(() => useApiRateLimit())

    // Start first retry
    act(() => {
      result.current.handleRetry(1, 5000)
    })

    expect(result.current.countdown).toBe(5)

    // Start second retry before first completes
    act(() => {
      result.current.handleRetry(2, 2000)
    })

    expect(result.current.countdown).toBe(2)

    // Advance time and verify only second timer is active
    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(result.current.countdown).toBe(1)
  })

  it('should expose retry state properties', () => {
    const { result } = renderHook(() => useApiRateLimit())

    act(() => {
      result.current.handleRetry(3, 3000)
    })

    expect(result.current.retryState).toEqual({
      isRetrying: true,
      attempt: 3,
      waitTime: 3000,
      countdown: 3,
    })
  })
})
