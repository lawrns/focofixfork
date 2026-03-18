'use client'

import { useCallback, useEffect, useState } from 'react'
import type { OpenClawRuntimeSnapshot } from '@/lib/openclaw/types'
import { apiFetch } from '@/lib/api/fetch-client'

export function useOpenClawRuntime() {
  const [data, setData] = useState<OpenClawRuntimeSnapshot | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch('/api/openclaw/runtime')
      const json = await res.json().catch(() => null)
      setData((json?.data ?? null) as OpenClawRuntimeSnapshot | null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { data, loading, refresh }
}
