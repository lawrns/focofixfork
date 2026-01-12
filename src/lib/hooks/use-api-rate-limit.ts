import { useState, useCallback, useRef } from 'react'

interface RetryState {
  isRetrying: boolean
  attempt: number
  waitTime: number
  countdown: number
}

/**
 * Hook for handling API rate limit retries with countdown
 * Provides user-friendly feedback during retry attempts
 */
export function useApiRateLimit() {
  const [retryState, setRetryState] = useState<RetryState>({
    isRetrying: false,
    attempt: 0,
    waitTime: 0,
    countdown: 0,
  })

  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null)

  /**
   * Handle retry event with countdown
   */
  const handleRetry = useCallback((attempt: number, waitTime: number) => {
    // Clear any existing countdown
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current)
    }

    // Set initial state
    setRetryState({
      isRetrying: true,
      attempt,
      waitTime,
      countdown: Math.ceil(waitTime / 1000),
    })

    // Start countdown
    let remaining = Math.ceil(waitTime / 1000)
    countdownIntervalRef.current = setInterval(() => {
      remaining -= 1

      if (remaining <= 0) {
        clearInterval(countdownIntervalRef.current!)
        setRetryState(prev => ({
          ...prev,
          isRetrying: false,
          countdown: 0,
        }))
        return
      }

      setRetryState(prev => ({
        ...prev,
        countdown: remaining,
      }))
    }, 1000)
  }, [])

  /**
   * Reset retry state
   */
  const reset = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current)
    }

    setRetryState({
      isRetrying: false,
      attempt: 0,
      waitTime: 0,
      countdown: 0,
    })
  }, [])

  /**
   * Get user-friendly message
   */
  const getMessage = useCallback((): string => {
    if (!retryState.isRetrying) {
      return ''
    }

    if (retryState.countdown === 0) {
      return `Retrying... (attempt ${retryState.attempt})`
    }

    const plural = retryState.countdown === 1 ? 'second' : 'seconds'
    return `Too many requests. Retrying in ${retryState.countdown} ${plural}... (attempt ${retryState.attempt})`
  }, [retryState])

  return {
    retryState,
    handleRetry,
    reset,
    getMessage,
    isRetrying: retryState.isRetrying,
    countdown: retryState.countdown,
    attempt: retryState.attempt,
  }
}
