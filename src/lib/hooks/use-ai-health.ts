'use client'

import { useState, useCallback } from 'react'
import type { AIModelHealth, AIRuntimeSourceHealth } from '@/lib/ai/runtime-health'
import { useVisibilityAwarePolling } from './use-visibility-aware-polling'

type AIHealthResponse = {
  ok: boolean
  status: string
  message: string
  models?: AIModelHealth[]
  runtime_sources?: AIRuntimeSourceHealth[]
}

export function useAIHealth() {
  const [data, setData] = useState<AIHealthResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const poll = useCallback(async (signal: AbortSignal) => {
    setLoading(true)
    try {
      const response = await fetch('/api/ai/health', { cache: 'no-store', signal })
      const payload = await response.json().catch(() => null)
      if (!signal.aborted) setData(payload)
    } catch {
      if (!signal.aborted) setData(null)
    } finally {
      if (!signal.aborted) setLoading(false)
    }
  }, [])

  useVisibilityAwarePolling(poll, 30_000)

  const models = data?.models ?? []
  const runtimeSources = data?.runtime_sources ?? []

  return {
    data,
    loading,
    getModelHealth(model: string | null | undefined) {
      if (!model) return null
      return models.find((item) => item.model === model) ?? null
    },
    getRuntimeSourceHealth(source: string | null | undefined) {
      if (!source) return null
      return runtimeSources.find((item) => item.source === source) ?? null
    },
  }
}
