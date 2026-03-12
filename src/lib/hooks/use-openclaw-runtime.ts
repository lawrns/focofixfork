'use client'

import { useCallback, useEffect, useState } from 'react'
import type { OpenClawRuntime } from '@/components/dashboard/use-dashboard-data'
import { apiFetch } from '@/lib/api/fetch-client'

export function useOpenClawRuntime() {
  const [data, setData] = useState<OpenClawRuntime | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch('/api/openclaw/runtime')
      const json = await res.json().catch(() => null)
      setData((json?.data ?? null) as OpenClawRuntime | null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { data, loading, refresh }
}
