'use client'

import { useState, useEffect, useCallback } from 'react'
import { BookOpen, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { PageShell } from '@/components/layout/page-shell'
import { PageHeader } from '@/components/layout/page-header'
import { useAuth } from '@/lib/hooks/use-auth'
import { cn } from '@/lib/utils'

type LedgerEvent = {
  id: string
  type: string
  source: string
  context_id: string | null
  correlation_id: string | null
  payload: Record<string, unknown>
  timestamp: string
}

export default function LedgerPage() {
  const { user, loading } = useAuth()
  const [events, setEvents] = useState<LedgerEvent[]>([])
  const [fetching, setFetching] = useState(false)
  const [typeFilter, setTypeFilter] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    setFetching(true)
    try {
      const params = new URLSearchParams({ limit: '100' })
      if (typeFilter) params.set('type', typeFilter)
      const res = await fetch(`/api/ledger?${params}`)
      const json = await res.json()
      setEvents(json.data ?? [])
    } finally {
      setFetching(false)
    }
  }, [typeFilter])

  useEffect(() => { if (user) load() }, [user, load])

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(() => { if (user) load() }, 30_000)
    return () => clearInterval(interval)
  }, [user, load])

  function toggleExpanded(id: string) {
    setExpanded(s => {
      const next = new Set(s)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[color:var(--foco-teal)]" /></div>
  if (!user) return null

  return (
    <PageShell>
      <PageHeader
        title="Ledger"
        subtitle="Append-only event log"
        primaryAction={
          <Button variant="outline" size="sm" onClick={load} disabled={fetching}>
            <RefreshCw className={cn('h-4 w-4 mr-2', fetching && 'animate-spin')} />
            Refresh
          </Button>
        }
      />

      <div className="flex gap-2">
        <Input
          placeholder="Filter by type..."
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && load()}
          className="max-w-xs text-sm"
        />
      </div>

      {events.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-3 text-center">
          <div className="h-12 w-12 rounded-2xl bg-[color:var(--foco-teal-dim)] flex items-center justify-center">
            <BookOpen className="h-6 w-6 text-[color:var(--foco-teal)]" />
          </div>
          <p className="text-sm font-medium">No events yet</p>
          <p className="text-xs text-muted-foreground">Critter and system events will appear here.</p>
        </div>
      ) : (
        <div className="space-y-1">
          {events.map(event => {
            const isOpen = expanded.has(event.id)
            return (
              <div key={event.id} className="rounded-lg border border-border bg-card overflow-hidden">
                <button
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-secondary/40 transition-colors"
                  onClick={() => toggleExpanded(event.id)}
                >
                  {isOpen
                    ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />}
                  <Badge variant="outline" className="font-mono text-[10px] flex-shrink-0">{event.type}</Badge>
                  <span className="text-[12px] text-muted-foreground">{event.source}</span>
                  {event.context_id && (
                    <span className="text-[11px] text-muted-foreground font-mono-display truncate">{event.context_id}</span>
                  )}
                  <span className="ml-auto text-[11px] text-muted-foreground flex-shrink-0">
                    {new Date(event.timestamp).toLocaleString()}
                  </span>
                </button>
                {isOpen && (
                  <div className="px-4 pb-3 pt-0">
                    <pre className="text-[11px] bg-secondary/50 rounded p-3 overflow-auto max-h-48 font-mono-display">
                      {JSON.stringify(event.payload, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </PageShell>
  )
}
