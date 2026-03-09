'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Activity, RefreshCw, Clock, Zap, CheckCircle2, DollarSign, Square, Trash2, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageShell } from '@/components/layout/page-shell'
import { PageHeader } from '@/components/layout/page-header'
import { useAuth } from '@/lib/hooks/use-auth'
import { cn } from '@/lib/utils'
import { CritterLaunchPadButton } from '@/components/critter/critter-launch-pad-button'
import type { Run } from '@/lib/types/runs'
import { RUN_STATUS_COLORS } from '@/lib/types/runs'
import { toast } from 'sonner'

interface RunStats {
  total_today: number
  pending: number
  running: number
  completed_today: number
  total_cost_today: number
  avg_pending_wait_seconds: number
}

// Status badge color map
const statusColors: Record<string, string> = {
  ...RUN_STATUS_COLORS,
}

function formatWait(seconds: number) {
  if (seconds < 60) return `${Math.round(seconds)}s`
  const mins = Math.floor(seconds / 60)
  const secs = Math.round(seconds % 60)
  return `${mins}m ${secs}s`
}

function queueTime(run: Run): string {
  if (run.status === 'pending') {
    const waited = (Date.now() - new Date(run.created_at).getTime()) / 1000
    return `Waiting ${formatWait(waited)}`
  }
  if (run.status === 'running' && run.started_at) {
    const waited = (new Date(run.started_at).getTime() - new Date(run.created_at).getTime()) / 1000
    return `Queued ${formatWait(waited)}`
  }
  return ''
}

function RunsPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading } = useAuth()
  const [runs, setRuns] = useState<Run[]>([])
  const [stats, setStats] = useState<RunStats | null>(null)
  const [fetching, setFetching] = useState(false)
  const [filter, setFilter] = useState(() => {
    const raw = searchParams?.get('status')
    return raw && ['pending', 'running', 'completed', 'failed'].includes(raw) ? raw : 'all'
  })
  const [runActionId, setRunActionId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setFetching(true)
    try {
      const params = new URLSearchParams()
      params.set('include', 'diagnostics,stream')
      if (filter !== 'all') params.set('status', filter)
      const [runsRes, statsRes] = await Promise.all([
        fetch(`/api/runs?${params.toString()}`),
        fetch('/api/runs/stats'),
      ])
      const runsJson = await runsRes.json()
      const statsJson = await statsRes.json()
      setRuns(runsJson.data ?? [])
      if (statsJson.data) setStats(statsJson.data)
    } finally {
      setFetching(false)
    }
  }, [filter])

  useEffect(() => { if (user) load() }, [user, load])

  useEffect(() => {
    const raw = searchParams?.get('status')
    const normalized = raw && ['pending', 'running', 'completed', 'failed'].includes(raw) ? raw : 'all'
    if (normalized !== filter) setFilter(normalized)
  }, [searchParams, filter])

  const handleFilterChange = useCallback((next: string) => {
    setFilter(next)
    const params = new URLSearchParams(searchParams?.toString() ?? '')
    if (next === 'all') params.delete('status')
    else params.set('status', next)
    const query = params.toString()
    router.replace(query ? `/runs?${query}` : '/runs', { scroll: false })
  }, [router, searchParams])

  const stopRun = useCallback(async (runId: string) => {
    setRunActionId(runId)
    try {
      const res = await fetch(`/api/runs/${runId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled', summary: 'Stopped from Runs page' }),
      })
      if (!res.ok) throw new Error('Failed to stop run')
      await load()
      toast.success('Run stopped')
    } catch {
      toast.error('Could not stop run')
    } finally {
      setRunActionId(null)
    }
  }, [load])

  const deleteRun = useCallback(async (runId: string) => {
    setRunActionId(runId)
    try {
      const res = await fetch(`/api/runs/${runId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete run')
      await load()
      toast.success('Run deleted')
    } catch {
      toast.error('Could not delete run')
    } finally {
      setRunActionId(null)
    }
  }, [load])

  const retryRun = useCallback(async (run: Run) => {
    setRunActionId(run.id)
    try {
      const res = await fetch(`/api/runs/${run.id}/retry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        ...(run.diagnostics?.retryHint ? { body: JSON.stringify(run.diagnostics.retryHint) } : {}),
      })
      if (!res.ok) throw new Error('Failed to retry run')
      const json = await res.json()
      const nextId = json.data?.id ?? json.id
      toast.success(run.diagnostics?.retryLabel ?? 'Run retried')
      if (typeof nextId === 'string') {
        router.push(`/runs/${nextId}`)
        return
      }
      await load()
    } catch {
      toast.error('Could not retry run')
    } finally {
      setRunActionId(null)
    }
  }, [load, router])

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[color:var(--foco-teal)]" /></div>
  if (!user) return null

  return (
    <PageShell className="space-y-5">
      <PageHeader
        title="Runs"
        subtitle="Agent execution history"
        primaryAction={
          <Button variant="outline" size="sm" onClick={load} disabled={fetching}>
            <RefreshCw className={cn('h-4 w-4 mr-2', fetching && 'animate-spin')} />
            Refresh
          </Button>
        }
      />

      <div className="rounded-xl border bg-card/80 backdrop-blur-sm p-3 sm:p-4 space-y-3 animate-slide-up">
        {/* Summary bar */}
        {stats && (
          <div className="flex flex-wrap items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-background text-[12px] text-muted-foreground">
            <span>
              <span className="font-semibold text-yellow-600 dark:text-yellow-400">{stats.pending}</span> pending
              {stats.pending > 0 && stats.avg_pending_wait_seconds > 0 && (
                <span className="ml-1">— avg wait {formatWait(stats.avg_pending_wait_seconds)}</span>
              )}
            </span>
            <span className="text-border hidden sm:inline">|</span>
            <span>
              <span className="font-semibold text-blue-600 dark:text-blue-400">{stats.running}</span> running
            </span>
            <span className="text-border hidden sm:inline">|</span>
            <span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">{stats.completed_today}</span> completed today
            </span>
            {stats.total_cost_today > 0 && (
              <>
                <span className="text-border hidden sm:inline">|</span>
                <span className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  Total today: <span className="font-semibold">${stats.total_cost_today.toFixed(4)}</span>
                </span>
              </>
            )}
          </div>
        )}

        <Tabs value={filter} onValueChange={handleFilterChange}>
          <TabsList className="w-full flex flex-wrap">
            {['all','pending','running','completed','failed'].map(s => (
              <TabsTrigger key={s} value={s} className="capitalize flex-1 min-w-[90px]">{s}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {runs.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-3 text-center">
          {filter === 'failed' ? (
            <>
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              </div>
              <p className="text-sm font-medium">No failed runs — fleet is healthy.</p>
            </>
          ) : (
            <>
              <div className="h-12 w-12 rounded-2xl bg-[color:var(--foco-teal-dim)] flex items-center justify-center">
                <Activity className="h-6 w-6 text-[color:var(--foco-teal)]" />
              </div>
              <p className="text-sm font-medium">
                {filter === 'all' && 'No runs recorded. Dispatch your first agent.'}
                {filter === 'pending' && 'Nothing queued.'}
                {filter === 'running' && 'No agents running right now.'}
                {filter === 'completed' && 'No completed runs yet.'}
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-2 animate-slide-up-delay">
          {runs.map(run => {
            const wait = queueTime(run)
            return (
              <Link
                key={run.id}
                href={`/runs/${run.id}`}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-card hover:bg-secondary/40 hover:shadow-sm transition-all cursor-pointer"
              >
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-[color:var(--foco-teal-dim)] flex items-center justify-center">
                  <Activity className="h-4 w-4 text-[color:var(--foco-teal)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13px] font-medium font-mono-display">{run.runner}</span>
                    <Badge className={cn('text-[10px] px-1.5 py-0 rounded-sm border-0', statusColors[run.status] ?? statusColors.cancelled)}>
                      {run.status}
                    </Badge>
                    {run.stream?.stream_state && ['pending', 'running'].includes(run.status) && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 rounded-sm text-muted-foreground capitalize">
                        stream {run.stream.stream_state}
                      </Badge>
                    )}
                    {wait && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 rounded-sm text-muted-foreground">
                        {wait}
                      </Badge>
                    )}
                    {run.cost_usd != null && run.cost_usd > 0 && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 rounded-sm text-emerald-600 dark:text-emerald-400">
                        ${run.cost_usd.toFixed(4)}
                      </Badge>
                    )}
                  </div>
                  {run.summary && <p className="text-[12px] text-muted-foreground truncate mt-0.5">{run.summary}</p>}
                  {run.status === 'failed' && run.diagnostics && (
                    <>
                      <p className="mt-1 text-[12px] text-red-600 dark:text-red-400 truncate">{run.diagnostics.lastError}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground truncate">{run.diagnostics.suggestion}</p>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {(run.status === 'running' || run.status === 'pending') && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={e => {
                        e.preventDefault()
                        void stopRun(run.id)
                      }}
                      disabled={runActionId === run.id}
                      title="Stop run"
                    >
                      <Square className="h-3 w-3" />
                    </Button>
                  )}
                  {run.status === 'failed' && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={e => {
                        e.preventDefault()
                        void retryRun(run)
                      }}
                      disabled={runActionId === run.id}
                      title={run.diagnostics?.retryLabel ?? 'Retry run'}
                    >
                      <RotateCcw className="h-3 w-3" />
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-red-600 hover:text-red-700"
                    onClick={e => {
                      e.preventDefault()
                      void deleteRun(run.id)
                    }}
                    disabled={runActionId === run.id}
                    title="Delete run"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                  {run.status === 'running' && (
                    <CritterLaunchPadButton
                      label={`Run ${run.id.slice(0, 6)}`}
                      runId={run.id}
                      runner={run.runner}
                      size="sm"
                      variant="ghost"
                      onClick={e => e.preventDefault()}
                      title="Dispatch critter swarm"
                    >
                      <Zap className="h-3 w-3" />
                    </CritterLaunchPadButton>
                  )}
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {new Date(run.created_at).toLocaleString()}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </PageShell>
  )
}

export default function RunsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[color:var(--foco-teal)]" />
      </div>
    }>
      <RunsPageContent />
    </Suspense>
  )
}
