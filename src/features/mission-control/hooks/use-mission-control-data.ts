'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { MissionControlSnapshot } from '@/features/mission-control/types'

type StreamState = 'idle' | 'loading' | 'live' | 'degraded'

export function useMissionControlData() {
  const [snapshot, setSnapshot] = useState<MissionControlSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [streamState, setStreamState] = useState<StreamState>('loading')

  const fetchSnapshot = useCallback(async () => {
    try {
      const response = await fetch('/api/mission-control', { cache: 'no-store' })
      if (!response.ok) throw new Error('Failed to load mission control snapshot')
      const payload = await response.json()
      setSnapshot(payload?.data ?? null)
      setStreamState((prev) => {
        if (prev === 'loading') return 'idle'
        return prev === 'live' ? 'live' : 'degraded'
      })
    } catch {
      setStreamState('degraded')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchSnapshot()
  }, [fetchSnapshot])

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.EventSource === 'undefined') {
      return
    }

    const stream = new window.EventSource('/api/stream/workspace')

    const handleSnapshot = (event: MessageEvent<string>) => {
      try {
        const payload = JSON.parse(event.data) as { data?: MissionControlSnapshot }
        if (payload?.data) {
          setSnapshot(payload.data)
          setLoading(false)
          setStreamState('live')
        }
      } catch {
        setStreamState('degraded')
      }
    }

    const handleWarning = () => {
      setStreamState('degraded')
    }

    stream.addEventListener('snapshot', handleSnapshot as EventListener)
    stream.addEventListener('warning', handleWarning)
    stream.onerror = () => {
      setStreamState('degraded')
    }

    return () => {
      stream.removeEventListener('snapshot', handleSnapshot as EventListener)
      stream.removeEventListener('warning', handleWarning)
      stream.close()
    }
  }, [])

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (streamState !== 'live') {
        void fetchSnapshot()
      }
    }, 20_000)

    return () => window.clearInterval(interval)
  }, [fetchSnapshot, streamState])

  const metrics = useMemo(() => snapshot?.metrics ?? [], [snapshot])

  return {
    snapshot,
    metrics,
    loading,
    streamState,
    refresh: fetchSnapshot,
  }
}
