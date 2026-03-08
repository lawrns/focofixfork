'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { PageShell } from '@/components/layout/page-shell'
import { PageHeader } from '@/components/layout/page-header'
import { BriefingCard } from '@/components/empire/briefing-card'
import { LoopsSummaryCard } from '@/components/autonomy/loops-summary-card'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'

function BriefingPageInner() {
  const searchParams = useSearchParams()
  const workspaceId = searchParams?.get('workspace_id') ?? null

  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/empire/briefing')
      const json = await res.json()
      setData(json)
      if (!res.ok) {
        setError(json?.error ?? 'Unavailable')
      } else if (json) {
        // Wire briefing insights into notifications
        void fetch('/api/notifications/from-briefing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ briefing: json }),
        }).catch(() => { /* best-effort */ })
      }
    } catch {
      setError('Service unreachable')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <PageShell>
      <PageHeader
        title="Daily Briefing"
        subtitle="Daily intelligence summary from your agent fleet"
        primaryAction={
          <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        }
      />
      <div className="w-full">
        <BriefingCard data={data} loading={loading} error={error} />
      </div>
      <div className="w-full mt-4">
        <LoopsSummaryCard workspaceId={workspaceId} />
      </div>
    </PageShell>
  )
}

export default function EmpireBriefingPage() {
  return (
    <Suspense>
      <BriefingPageInner />
    </Suspense>
  )
}
