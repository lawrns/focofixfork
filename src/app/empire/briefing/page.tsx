'use client'

import { useState, useEffect } from 'react'
import { PageShell } from '@/components/layout/page-shell'
import { PageHeader } from '@/components/layout/page-header'
import { BriefingCard } from '@/components/empire/briefing-card'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'

export default function EmpireBriefingPage() {
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
      if (!res.ok) setError(json?.error ?? 'Unavailable')
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
        title="Morning Briefing"
        subtitle="Daily intelligence summary from ClawdBot Empire OS"
        primaryAction={
          <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        }
      />
      <div className="max-w-2xl">
        <BriefingCard data={data} loading={loading} error={error} />
      </div>
    </PageShell>
  )
}
