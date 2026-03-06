'use client'

import { useEffect, useState } from 'react'
import type { AIModelHealth, AIRuntimeSourceHealth } from '@/lib/ai/runtime-health'

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

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        const response = await fetch('/api/ai/health', { cache: 'no-store' })
        const payload = await response.json().catch(() => null)
        if (!cancelled) {
          setData(payload)
        }
      } catch {
        if (!cancelled) {
          setData(null)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()
    const interval = window.setInterval(load, 30000)
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [])

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
