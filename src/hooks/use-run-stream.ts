'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { AgentExecutionEvent, AgentExecutionStatus } from '@/components/command-surface/types'
import type { TerminalLine, TerminalToken } from '@/components/dashboard/run-card'

const SOAP_REGEX = /^\[(ACTION|OBSERVE|PLAN|INIT|RESULT|ERROR)\]\s*/
const LOOKUP_RETRY_DELAYS_MS = [400, 800, 1200, 1600, 2000, 2500]

function parseToken(text: string): { token: TerminalToken; cleanText: string } {
  const match = text.match(SOAP_REGEX)
  if (match) {
    return { token: match[1] as TerminalToken, cleanText: text.slice(match[0].length) }
  }
  return { token: 'OBSERVE', cleanText: text }
}

type UseRunStreamResult = {
  lines: TerminalLine[]
  status: AgentExecutionStatus | null
  connected: boolean
  connectionState: 'idle' | 'resolving' | 'connecting' | 'live' | 'ended' | 'unavailable'
}

export function useRunStream(
  runId: string | null,
  jobId: string | null
): UseRunStreamResult {
  const [lines, setLines] = useState<TerminalLine[]>([])
  const [status, setStatus] = useState<AgentExecutionStatus | null>(null)
  const [connected, setConnected] = useState(false)
  const [connectionState, setConnectionState] = useState<UseRunStreamResult['connectionState']>('idle')
  const abortRef = useRef<AbortController | null>(null)
  const retryTimeoutRef = useRef<number | null>(null)

  const connectToStream = useCallback(async (targetJobId: string) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setConnectionState('connecting')

    try {
      const res = await fetch(`/api/command-surface/stream/${targetJobId}`, {
        signal: controller.signal,
      })

      if (!res.ok || !res.body) {
        setConnected(false)
        setConnectionState('unavailable')
        return
      }

      setConnected(true)
      setConnectionState('live')
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const chunks = buffer.split('\n\n')
        buffer = chunks.pop() ?? ''

        for (const chunk of chunks) {
          for (const line of chunk.split('\n')) {
            if (!line.startsWith('data: ')) continue
            try {
              const event = JSON.parse(line.slice(6)) as AgentExecutionEvent

              if (event.type === 'output_chunk') {
                const { token, cleanText } = parseToken(event.text)
                setLines((prev) => [
                  ...prev.slice(-200),
                  {
                    id: `${Date.now()}-${Math.random()}`,
                    token,
                    text: cleanText,
                    ts: Date.now(),
                  },
                ])
              }

              if (event.type === 'reasoning') {
                setLines((prev) => [
                  ...prev.slice(-200),
                  {
                    id: `${Date.now()}-${Math.random()}`,
                    token: 'PLAN',
                    text: event.text,
                    ts: Date.now(),
                  },
                ])
              }

              if (event.type === 'status_update') {
                setStatus(event.status)
              }

              if (event.type === 'error') {
                setLines((prev) => [
                  ...prev.slice(-200),
                  {
                    id: `${Date.now()}-${Math.random()}`,
                    token: 'ERROR',
                    text: event.message,
                    ts: Date.now(),
                  },
                ])
              }

              if (event.type === 'done') {
                const summary = event.summary ?? (event.exitCode === 0 ? 'Completed' : 'Failed')
                setLines((prev) => [
                  ...prev.slice(-200),
                  {
                    id: `${Date.now()}-${Math.random()}`,
                    token: event.exitCode === 0 ? 'RESULT' : 'ERROR',
                    text: summary,
                    ts: Date.now(),
                  },
                ])
                setConnected(false)
                setConnectionState('ended')
                return
              }
            } catch {
              // ignore malformed SSE
            }
          }
        }
      }
      setConnected(false)
      setConnectionState('ended')
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setConnected(false)
      setConnectionState('unavailable')
    }
  }, [])

  useEffect(() => {
    setLines([])
    setStatus(null)
    setConnected(false)
    setConnectionState(runId || jobId ? 'resolving' : 'idle')
    if (retryTimeoutRef.current) {
      window.clearTimeout(retryTimeoutRef.current)
      retryTimeoutRef.current = null
    }

    if (jobId) {
      void connectToStream(jobId)
    } else if (runId) {
      const controller = new AbortController()
      abortRef.current = controller
      let cancelled = false

      const resolveByRunId = async (attempt = 0): Promise<void> => {
        try {
          setConnectionState('resolving')
          const res = await fetch(`/api/command-surface/stream/by-run/${runId}`, { signal: controller.signal })
          if (res.ok) {
            const data = await res.json() as { jobId?: string } | null
            if (data?.jobId) {
              void connectToStream(data.jobId)
              return
            }
          } else if (!res.ok) {
            // If the server signals the run is too old to ever get a stream,
            // stop retrying immediately instead of spamming 6 more requests.
            try {
              const body = await res.json() as { retryable?: boolean } | null
              if (body?.retryable === false) {
                setConnectionState('unavailable')
                return
              }
            } catch {
              // ignore parse failure — fall through to retry logic
            }
          }
        } catch (err) {
          if (err instanceof DOMException && err.name === 'AbortError') return
        }

        if (cancelled) return
        const nextDelay = LOOKUP_RETRY_DELAYS_MS[attempt]
        if (typeof nextDelay !== 'number') {
          setConnectionState('unavailable')
          return
        }
        retryTimeoutRef.current = window.setTimeout(() => {
          void resolveByRunId(attempt + 1)
        }, nextDelay)
      }

      void resolveByRunId()

      return () => {
        cancelled = true
        controller.abort()
        if (retryTimeoutRef.current) {
          window.clearTimeout(retryTimeoutRef.current)
          retryTimeoutRef.current = null
        }
      }
    }

    return () => {
      abortRef.current?.abort()
      if (retryTimeoutRef.current) {
        window.clearTimeout(retryTimeoutRef.current)
        retryTimeoutRef.current = null
      }
    }
  }, [runId, jobId, connectToStream])

  return { lines, status, connected, connectionState }
}
