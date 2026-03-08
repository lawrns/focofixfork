'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { BookOpen, RefreshCw, ChevronDown, ChevronRight, ExternalLink, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PageShell } from '@/components/layout/page-shell'
import { PageHeader } from '@/components/layout/page-header'
import { useAuth } from '@/lib/hooks/use-auth'
import { cn } from '@/lib/utils'

const SOURCE_COLORS: Record<string, string> = {
  policy: 'border-purple-500/40 text-purple-600 dark:text-purple-400 bg-purple-500/10',
  clawdbot: 'border-cyan-500/40 text-cyan-600 dark:text-cyan-400 bg-cyan-500/10',
  fleet: 'border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10',
  system: 'border-zinc-500/40 text-zinc-600 dark:text-zinc-400 bg-zinc-500/10',
  cofounder_loop: 'border-indigo-500/40 text-indigo-600 dark:text-indigo-400 bg-indigo-500/10',
}

function getSourceBadgeClass(source: string): string {
  return SOURCE_COLORS[source] ?? ''
}

function getTypeBadgeClass(type: string): string {
  if (/error|fail/i.test(type)) return 'border-rose-500/40 text-rose-600 dark:text-rose-400 bg-rose-500/10'
  if (/warn/i.test(type)) return 'border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10'
  return ''
}

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
  const [sourceFilter, setSourceFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    setFetching(true)
    try {
      const params = new URLSearchParams({ limit: '100' })
      if (typeFilter) params.set('type', typeFilter)
      if (sourceFilter) params.set('source', sourceFilter)
      if (dateFrom) params.set('from', new Date(dateFrom).toISOString())
      if (dateTo) params.set('to', new Date(dateTo + 'T23:59:59').toISOString())
      const res = await fetch(`/api/ledger?${params}`)
      const json = await res.json()
      setEvents(json.data ?? [])
    } finally {
      setFetching(false)
    }
  }, [typeFilter, sourceFilter, dateFrom, dateTo])

  const exportCsv = useCallback(() => {
    if (events.length === 0) return
    const headers = ['id', 'type', 'source', 'context_id', 'timestamp', 'payload']
    const rows = events.map(e => [
      e.id,
      e.type,
      e.source,
      e.context_id ?? '',
      e.timestamp,
      JSON.stringify(e.payload),
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [events])

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
        title="Audit Log"
        subtitle="Append-only event log"
        primaryAction={
          <Button variant="outline" size="sm" onClick={load} disabled={fetching}>
            <RefreshCw className={cn('h-4 w-4 mr-2', fetching && 'animate-spin')} />
            Refresh
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2 items-end">
        <div className="space-y-1">
          <label className="text-[11px] text-muted-foreground">Type</label>
          <Input
            placeholder="Filter by type..."
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && load()}
            className="w-40 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] text-muted-foreground">Source</label>
          <Select value={sourceFilter || '_all_'} onValueChange={v => setSourceFilter(v === '_all_' ? '' : v)}>
            <SelectTrigger className="w-40 text-sm">
              <SelectValue placeholder="All sources" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all_">All sources</SelectItem>
              <SelectItem value="clawdbot">clawdbot</SelectItem>
              <SelectItem value="policy">policy</SelectItem>
              <SelectItem value="cofounder_loop">cofounder_loop</SelectItem>
              <SelectItem value="system">system</SelectItem>
              <SelectItem value="fleet">fleet</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-[11px] text-muted-foreground">From</label>
          <Input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="w-36 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] text-muted-foreground">To</label>
          <Input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="w-36 text-sm"
          />
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={fetching} className="h-9">
          Apply
        </Button>
        <Button variant="outline" size="sm" onClick={exportCsv} disabled={events.length === 0} className="h-9 gap-1.5">
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </Button>
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
                  <Badge variant="outline" className={cn("font-mono text-[10px] flex-shrink-0", getTypeBadgeClass(event.type))}>{event.type}</Badge>
                  <Badge variant="outline" className={cn("text-[10px] flex-shrink-0", getSourceBadgeClass(event.source))}>{event.source}</Badge>
                  {event.context_id && (
                    <span className="text-[11px] text-muted-foreground font-mono-display truncate">{event.context_id}</span>
                  )}
                  <span className="ml-auto text-[11px] text-muted-foreground flex-shrink-0">
                    {new Date(event.timestamp).toLocaleString()}
                  </span>
                </button>
                {isOpen && (
                  <div className="px-4 pb-3 pt-0 space-y-2">
                    {/* View Run link if payload references a run */}
                    {(() => {
                      const payload = event.payload as Record<string, string | undefined>
                      const runId = payload.run_id ?? payload.runId
                      if (!runId) return null
                      return (
                        <Link
                          href={`/runs/${runId}`}
                          className="inline-flex items-center gap-1 text-[11px] text-[color:var(--foco-teal)] dark:text-[color:var(--foco-teal)] hover:underline"
                          onClick={e => e.stopPropagation()}
                        >
                          <ExternalLink className="h-3 w-3" />
                          View Run
                        </Link>
                      )
                    })()}
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
