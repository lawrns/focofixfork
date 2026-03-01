'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

export interface LogEntry {
  type: string
  time?: string
  level?: string
  message?: string
  runId?: string
  [key: string]: unknown
}

export function useOpenClawLogs(maxEntries = 500): {
  logs: LogEntry[]
  connected: boolean
  clear: () => void
} {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [connected, setConnected] = useState(false)
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    const es = new EventSource('/api/openclaw-gateway/logs')
    esRef.current = es

    es.onopen = () => setConnected(true)

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as LogEntry
        setLogs(prev => [...prev.slice(-(maxEntries - 1)), data])
      } catch {
        // ignore parse errors
      }
    }

    es.onerror = () => setConnected(false)

    return () => {
      es.close()
      esRef.current = null
    }
  }, [maxEntries])

  const clear = useCallback(() => setLogs([]), [])

  return { logs, connected, clear }
}
