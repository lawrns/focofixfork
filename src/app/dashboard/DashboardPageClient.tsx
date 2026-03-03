'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/use-auth'
import { PageShell } from '@/components/layout/page-shell'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import ErrorBoundary from '@/components/error/error-boundary'
import { CritterLaunchPadButton } from '@/components/critter/critter-launch-pad-button'
import dynamic from 'next/dynamic'
import { toast } from 'sonner'

// Lazy-load AIInsights — it instantiates OpenAIService at module load time,
// which throws in dev when GLM_API_KEY / OPENAI_API_KEY is not set.
// dynamic() isolates the error to this widget only.
const AIInsights = dynamic(
  () => import('@/components/dashboard/AIInsights').then(m => m.AIInsights),
  { ssr: false, loading: () => null }
)
import {
  Activity,
  Cpu,
  Pause,
  Play,
  RefreshCw,
  Clock,
  Loader2,
  Zap,
  BookOpen,
  Flag,
  TrendingUp,
  Trash2,
  Square,
} from 'lucide-react'
import { CommandSurface } from '@/components/command-surface'

type Run = {
  id: string
  runner: string
  status: string
  task_id: string | null
  started_at: string | null
  ended_at: string | null
}

type LedgerEvent = {
  id: string
  type: string
  source: string | null
  payload: any
  timestamp: string
}

function elapsed(start: string | null): string {
  if (!start) return '—'
  const ms = Date.now() - new Date(start).getTime()
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ${s % 60}s`
  return `${Math.floor(m / 60)}h ${m % 60}m`
}

function ActiveRunsCard() {
  const [runs, setRuns] = useState<any[]>([])
  const [busyRunId, setBusyRunId] = useState<string | null>(null)

  const poll = useCallback(async () => {
    try {
      const res = await fetch('/api/runs?status=running&limit=5')
      const json = await res.json()
      setRuns(json.data ?? [])
    } catch {
      // silent — card simply stays hidden
    }
  }, [])

  const stopRun = useCallback(async (runId: string) => {
    setBusyRunId(runId)
    try {
      const res = await fetch(`/api/runs/${runId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled', summary: 'Stopped from Active Runs' }),
      })
      if (!res.ok) throw new Error('Failed to stop run')
      toast.success('Run stopped')
      await poll()
    } catch {
      toast.error('Could not stop run')
    } finally {
      setBusyRunId(null)
    }
  }, [poll])

  const deleteRun = useCallback(async (runId: string) => {
    setBusyRunId(runId)
    try {
      const res = await fetch(`/api/runs/${runId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete run')
      toast.success('Run deleted')
      setRuns(prev => prev.filter(r => r.id !== runId))
    } catch {
      toast.error('Could not delete run')
    } finally {
      setBusyRunId(null)
    }
  }, [])

  useEffect(() => {
    poll()
    const interval = setInterval(poll, 10_000)
    return () => clearInterval(interval)
  }, [poll])

  if (runs.length === 0) return null

  return (
    <div className="rounded-lg border border-border bg-card mb-6">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <Loader2 className="h-3.5 w-3.5 text-teal-400 animate-spin" />
        <span className="text-sm font-semibold">Active Runs</span>
        <Badge
          variant="secondary"
          className="ml-1 text-[10px] bg-teal-950/60 text-teal-400 border-teal-800"
        >
          {runs.length}
        </Badge>
      </div>
      <div className="divide-y divide-border">
        {runs.map((run) => (
          <div key={run.id} className="px-4 py-3 flex items-center gap-3">
            <Loader2 className="h-3.5 w-3.5 text-teal-400 animate-spin shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-foreground">
                {run.summary ?? run.runner ?? run.id}
              </p>
              {run.summary && run.runner && (
                <p className="text-[10px] text-muted-foreground font-mono truncate mt-0.5">
                  {run.runner}
                </p>
              )}
            </div>
            <span className="text-[10px] text-muted-foreground font-mono shrink-0 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {elapsed(run.started_at ?? null)}
            </span>
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                disabled={busyRunId === run.id}
                onClick={() => stopRun(run.id)}
                title="Stop run"
              >
                <Square className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-red-600 hover:text-red-700"
                disabled={busyRunId === run.id}
                onClick={() => deleteRun(run.id)}
                title="Delete run"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function DashboardPageClient() {
  const router = useRouter()
  const { user, loading } = useAuth()

  const [relayReachable, setRelayReachable] = useState<boolean | null>(null) // null = loading
  const [tokenValid, setTokenValid] = useState<boolean | null>(null)
  const [attachedTabs, setAttachedTabs] = useState(0)
  const [activeRuns, setActiveRuns] = useState<Run[]>([])
  const [allRuns, setAllRuns] = useState<Run[]>([])
  const [fleetPaused, setFleetPaused] = useState(false)
  const [recentEvents, setRecentEvents] = useState<LedgerEvent[]>([])
  const [refreshing, setRefreshing] = useState(false)

  const [autonomousStats, setAutonomousStats] = useState({ improvementsWeek: 0, handbookEntries: 0 })
  const hasFetched = useRef(false)

  useEffect(() => {
    document.title = 'Dashboard | Critter'
  }, [])

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  const fetchAll = useCallback(async () => {
    if (!user) return
    setRefreshing(true)

    try {
      const [statusRes, runsRes, fleetRes, ledgerRes] = await Promise.allSettled([
        fetch('/api/openclaw/status'),
        fetch('/api/runs'),
        fetch('/api/policies/fleet-status'),
        fetch('/api/ledger?limit=10'),
      ])

      // Gateway status
      if (statusRes.status === 'fulfilled' && statusRes.value.ok) {
        const d = await statusRes.value.json()
        setRelayReachable(d.relay?.reachable ?? false)
        setTokenValid(d.token?.valid ?? false)
        setAttachedTabs(d.tabs?.filter((t: any) => t.attached).length ?? 0)
      } else {
        setRelayReachable(false)
        setTokenValid(false)
        setAttachedTabs(0)
      }

      // Runs
      if (runsRes.status === 'fulfilled' && runsRes.value.ok) {
        const d = await runsRes.value.json()
        const runs: Run[] = d.data || d.runs || []
        setAllRuns(runs)
        setActiveRuns(runs.filter((r: Run) => r.status === 'running' || r.status === 'pending'))
      }

      // Fleet status
      if (fleetRes.status === 'fulfilled' && fleetRes.value.ok) {
        const d = await fleetRes.value.json()
        if (typeof d.paused === 'boolean') setFleetPaused(d.paused)
      }

      // Ledger events
      if (ledgerRes.status === 'fulfilled' && ledgerRes.value.ok) {
        const d = await ledgerRes.value.json()
        setRecentEvents(d.data || d.events || [])
      }

      // Autonomous improvement stats (lightweight cached read)
      fetch('/api/dashboard/autonomous-stats')
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          if (d) {
            setAutonomousStats({ improvementsWeek: d.improvementsWeek ?? 0, handbookEntries: d.improvementsMonth ?? 0 })
          }
        })
        .catch(() => {})
    } catch {
      // individual errors handled above
    } finally {
      setRefreshing(false)
    }
  }, [user])

  useEffect(() => {
    if (user && !hasFetched.current) {
      hasFetched.current = true
      fetchAll()
    }
  }, [user, fetchAll])

  // Auto-refresh every 30s
  useEffect(() => {
    if (!user) return
    const interval = setInterval(fetchAll, 30_000)
    return () => clearInterval(interval)
  }, [user, fetchAll])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!user) return null

  const recentEventsCount = recentEvents.length

  return (
    <ErrorBoundary>
      <PageShell>
        <PageHeader
          title="Execution Dashboard"
          subtitle="Goal 1 first: track work that gets to 10 paying customers"
          primaryAction={
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchAll()}
              disabled={refreshing}
            >
              <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
              <span className="hidden sm:inline ml-1">Refresh</span>
            </Button>
          }
        />

        <div className="mb-6 rounded-lg border border-zinc-200/80 dark:border-zinc-800 bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-zinc-500 font-medium">Strategic Rule</p>
              <h2 className="text-sm font-semibold mt-1">Revenue is the only feature that matters right now.</h2>
              <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-1">
                Use this dashboard to prioritize customer-facing execution over platform complexity.
              </p>
            </div>
            <Badge variant="outline" className="text-[11px] border-emerald-300 text-emerald-700 bg-emerald-500/10">
              <Flag className="h-3 w-3 mr-1" />
              G1 Absolute Priority
            </Badge>
          </div>
        </div>

        {/* Orchestration Health */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
              Execution Health
            </span>
            {fleetPaused && (
              <Badge variant="destructive" className="text-[10px] ml-1">Fleet Paused</Badge>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
            <div className="rounded-lg border bg-card p-3 space-y-1">
              <div className="text-[10px] text-muted-foreground font-mono">Running</div>
              <div className="text-2xl font-bold text-[color:var(--foco-teal)]">
                {activeRuns.filter(r => r.status === 'running').length}
              </div>
            </div>
            <div className="rounded-lg border bg-card p-3 space-y-1">
              <div className="text-[10px] text-muted-foreground font-mono">Pending</div>
              <div className="text-2xl font-bold text-amber-500">
                {activeRuns.filter(r => r.status === 'pending').length}
              </div>
            </div>
            <div className="rounded-lg border bg-card p-3 space-y-1">
              <div className="text-[10px] text-muted-foreground font-mono">Completed</div>
              <div className="text-2xl font-bold text-emerald-500">
                {allRuns.filter(r => r.status === 'completed').length}
              </div>
            </div>
            <div className="rounded-lg border bg-card p-3 space-y-1">
              <div className="text-[10px] text-muted-foreground font-mono">Recent Events</div>
              <div className="text-2xl font-bold">{recentEventsCount}</div>
            </div>
            <div className="rounded-lg border bg-card p-3 space-y-1">
              <div className="text-[10px] text-muted-foreground font-mono">Fleet</div>
              <div className={cn(
                'text-sm font-semibold',
                fleetPaused ? 'text-rose-500' : 'text-emerald-500'
              )}>
                {fleetPaused ? 'Paused' : 'Active'}
              </div>
            </div>
            <div className="rounded-lg border bg-card p-3 space-y-1">
              <div className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
                <Zap className="h-3 w-3" /> Auto
              </div>
              <div className="text-2xl font-bold text-[color:var(--foco-teal)]">
                {autonomousStats.improvementsWeek}
              </div>
              <div className="text-[9px] text-muted-foreground">this week</div>
            </div>
            <div className="rounded-lg border bg-card p-3 space-y-1">
              <div className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> G1 Share
              </div>
              <div className="text-2xl font-bold">
                {allRuns.length > 0 ? `${Math.round((allRuns.filter(r => /revenue|customer|sales|onboard|trial/i.test((r.runner || '') + ' ' + (r.task_id || ''))).length / allRuns.length) * 100)}%` : '—'}
              </div>
              <div className="text-[9px] text-muted-foreground">runs tagged by revenue intent</div>
            </div>
          </div>
        </div>

        {/* Active Runs — live polling widget, hidden when idle */}
        <ActiveRunsCard />

        {/* Command Surface */}
        <CommandSurface
          context="dashboard"
          className="mb-6"
          onExecutionComplete={() => {
            // Refresh data after command execution
            setTimeout(fetchAll, 1000)
          }}
        />

        {/* Fleet Status Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {/* Relay */}
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Cpu className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium">AI Gateway</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={cn(
                'h-2 w-2 rounded-full',
                relayReachable === null ? 'bg-yellow-500 animate-pulse' :
                relayReachable ? 'bg-emerald-500' : 'bg-red-500'
              )} />
              <span className="text-sm font-semibold">
                {relayReachable === null ? 'Checking...' : relayReachable ? 'Reachable' : 'Down'}
              </span>
            </div>
          </div>

          {/* Token */}
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Cpu className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium">Authentication</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={cn(
                'h-2 w-2 rounded-full',
                tokenValid === null ? 'bg-yellow-500 animate-pulse' :
                tokenValid ? 'bg-emerald-500' : 'bg-red-500'
              )} />
              <span className="text-sm font-semibold">
                {tokenValid === null ? 'Checking...' : tokenValid ? 'Valid' : 'Invalid'}
              </span>
            </div>
          </div>

          {/* Active Sessions */}
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Cpu className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium">Active Sessions</span>
            </div>
            <span className="text-2xl font-bold font-mono">{attachedTabs}</span>
          </div>

          {/* Active runs */}
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium">Running & Queued</span>
            </div>
            <span className="text-2xl font-bold font-mono">{activeRuns.length}</span>
          </div>

          {/* Fleet state */}
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-2">
              {fleetPaused ? (
                <Pause className="h-4 w-4 text-amber-500" />
              ) : (
                <Play className="h-4 w-4 text-emerald-500" />
              )}
              <span className="text-xs text-muted-foreground font-medium">Fleet State</span>
            </div>
            <Badge variant={fleetPaused ? 'secondary' : 'default'} className="text-xs">
              {fleetPaused ? 'PAUSED' : 'ACTIVE'}
            </Badge>
          </div>

          {/* Recent events */}
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium">Recent Events</span>
            </div>
            <span className="text-2xl font-bold font-mono">{recentEventsCount}</span>
          </div>
        </div>

        {/* Two-column layout: Active Runs + Recent Ledger */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Active Runs */}
          <div className="rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="text-sm font-semibold">Running & Queued</h3>
              <Button variant="ghost" size="sm" onClick={() => router.push('/runs')}>
                View all
              </Button>
            </div>
            <div className="divide-y divide-border">
              {activeRuns.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No active runs. Dispatch an agent to get started.
                </div>
              ) : (
                activeRuns.slice(0, 8).map((run) => (
                  <div key={run.id} className="px-4 py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{run.runner}</span>
                        <Badge variant="secondary" className="text-[10px] shrink-0">
                          {run.status}
                        </Badge>
                      </div>
                      {run.task_id && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {run.task_id}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground font-mono shrink-0">
                      {elapsed(run.started_at)}
                    </span>
                    <CritterLaunchPadButton
                      runId={run.id}
                      runner={run.runner}
                      variant="ghost"
                      size="icon-sm"
                    />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Ledger Events */}
          <div className="rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="text-sm font-semibold">Recent Events</h3>
              <Button variant="ghost" size="sm" onClick={() => router.push('/ledger')}>
                View all
              </Button>
            </div>
            <div className="divide-y divide-border">
              {recentEvents.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No events yet.
                </div>
              ) : (
                recentEvents.map((evt) => {
                  const d = new Date(evt.timestamp)
                  const timeStr = isNaN(d.getTime()) ? 'Unknown' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  return (
                    <div key={evt.id} className="px-4 py-2.5 flex items-center gap-3">
                      <BookOpen className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-medium">
                          {evt.type}
                        </span>
                        {evt.source && (
                          <span className="text-xs text-muted-foreground ml-1.5">
                            · {evt.source}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                        {timeStr}
                      </span>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>

        {/* AI Insights — silent fallback when AI service keys aren't configured */}
        <ErrorBoundary fallback={() => null}>
          <AIInsights
            userId={user.id}
            className="mb-6"
            runs={allRuns}
            recentEvents={recentEvents}
          />
        </ErrorBoundary>

        {/* Execution Surfaces */}
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Cpu className="h-4 w-4 text-[color:var(--foco-teal)]" />
            Execution Surfaces
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            Use Command Center for primary execution. Legacy OpenClaw dispatch remains available during migration.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={() => router.push('/empire/command')}>Open Command Center</Button>
            <Button variant="outline" onClick={() => router.push('/openclaw')}>
              Open Legacy Dispatch
            </Button>
          </div>
        </div>
      </PageShell>
    </ErrorBoundary>
  )
}
