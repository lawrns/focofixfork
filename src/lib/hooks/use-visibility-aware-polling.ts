'use client'

import { useEffect, useRef, useCallback } from 'react'

/**
 * Polling hook that automatically pauses when the tab is hidden.
 * Saves battery and network by not polling in background tabs.
 *
 * @param fn       Async function to call on each tick
 * @param interval Polling interval in ms (default 30 000)
 * @param options  enabled – master toggle (default true)
 */
export function useVisibilityAwarePolling(
  fn: (signal: AbortSignal) => Promise<void>,
  interval: number = 30_000,
  options: { enabled?: boolean } = {}
) {
  const { enabled = true } = options
  const fnRef = useRef(fn)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Always point at the latest callback without re-subscribing
  useEffect(() => {
    fnRef.current = fn
  }, [fn])

  const tick = useCallback(async () => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    try {
      await fnRef.current(controller.signal)
    } catch {
      // swallow — consumer decides whether to surface errors
    }
  }, [])

  const start = useCallback(() => {
    if (intervalRef.current) return // already running
    void tick() // immediate first tick
    intervalRef.current = setInterval(tick, interval)
  }, [tick, interval])

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    abortRef.current?.abort()
  }, [])

  useEffect(() => {
    if (!enabled) {
      stop()
      return
    }

    // Only poll when the tab is visible
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        start()
      } else {
        stop()
      }
    }

    // Kick off based on current visibility
    if (document.visibilityState === 'visible') {
      start()
    }

    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      stop()
    }
  }, [enabled, start, stop])
}
