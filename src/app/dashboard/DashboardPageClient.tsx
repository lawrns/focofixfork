'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/use-auth'
import { PageShell } from '@/components/layout/page-shell'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MetricTile } from '@/components/ui/metric-tile'
import { cn } from '@/lib/utils'
import ErrorBoundary from '@/components/error/error-boundary'
import dynamic from 'next/dynamic'
import { ActiveRuns } from './ActiveRuns'

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
  Zap,
  BookOpen,
  Flag,
  X,
  Terminal,
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
  const [showStrategicBanner, setShowStrategicBanner] = useState(true)
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

  useEffect(() => {
    const handleRunsMutated = () => {
      void fetchAll()
    }
    window.addEventListener('runs:mutated', handleRunsMutated)
    return () => window.removeEventListener('runs:mutated', handleRunsMutated)
  }, [fetchAll])

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
      <PageShell className="space-y-5">
        <PageHeader
          title="Execution Dashboard"
          subtitle="Goal 1 first: track work that gets to 10 paying customers"
          primaryAction={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchAll()}
                disabled={refreshing}
              >
                <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
                <span className="hidden sm:inline ml-1">Refresh</span>
              </Button>
            </div>
          }
        />

        {/* Command Surface - Elevated and Prominent */}
        <div className="mb-6 animate-slide-up">
          <CommandSurface
            context="dashboard"
            className="border-0 shadow-none"
            onExecutionComplete={() => {
              // Refresh data after command execution
              setTimeout(fetchAll, 1000)
            }}
          />
        </div>

        {/* Strategic Banner - Collapsible/Dismissible */}
        {showStrategicBanner && (
          <div className="mb-6 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-card/90 backdrop-blur-sm p-4 relative animate-slide-up-delay">
            <button
              onClick={() => setShowStrategicBanner(false)}
              className="absolute top-2 right-2 p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
              aria-label="Dismiss strategic banner"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-start justify-between gap-3 pr-8">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-zinc-500 font-medium">Strategic Rule</p>
                <h2 className="text-sm font-semibold mt-1">Revenue is the only feature that matters right now.</h2>
                <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-1">
                  Use this dashboard to prioritize customer-facing execution over platform complexity.
                </p>
              </div>
              <Badge variant="outline" className="text-[11px] border-emerald-300 text-emerald-700 bg-emerald-500/10 shrink-0">
                <Flag className="h-3 w-3 mr-1" />
                G1 Absolute Priority
              </Badge>
            </div>
          </div>
        )}

        {/* Orchestration Health */}
        <div className="mb-6 animate-slide-up-delay">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
              Execution Health
            </span>
            {fleetPaused && (
              <Badge variant="destructive" className="text-[10px] ml-1">Fleet Paused</Badge>
            )}
          </div>
          <div className="rounded-xl border bg-card/80 backdrop-blur-sm p-3 sm:p-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            <MetricTile
              label="Running"
              value={activeRuns.filter(r => r.status === 'running').length}
              valueClassName="text-[color:var(--foco-teal)]"
              onClick={() => router.push('/runs?status=running')}
            />
            <MetricTile
              label="Pending"
              value={activeRuns.filter(r => r.status === 'pending').length}
              valueClassName="text-amber-500"
              onClick={() => router.push('/runs?status=pending')}
            />
            <MetricTile
              label="Completed"
              value={allRuns.filter(r => r.status === 'completed').length}
              valueClassName="text-emerald-500"
              onClick={() => router.push('/runs?status=completed')}
            />
            <MetricTile
              label="Recent Events"
              value={recentEventsCount}
              onClick={() => router.push('/ledger')}
            />
            <MetricTile
              label="Fleet"
              value={fleetPaused ? 'Paused' : 'Active'}
              valueClassName={fleetPaused ? 'text-sm font-semibold text-rose-500' : 'text-sm font-semibold text-emerald-500'}
              onClick={() => router.push('/policies')}
            />
            <MetricTile
              label="Auto"
              value={autonomousStats.improvementsWeek}
              valueClassName="text-[color:var(--foco-teal)]"
              subtitle="this week"
              onClick={() => router.push('/ledger')}
            />
            <MetricTile
              label="G1 Share"
              value={allRuns.length > 0 ? `${Math.round((allRuns.filter(r => /revenue|customer|sales|onboard|trial/i.test((r.runner || '') + ' ' + (r.task_id || ''))).length / allRuns.length) * 100)}%` : '—'}
              subtitle="runs tagged by revenue intent"
              onClick={() => router.push('/runs')}
            />
            </div>
          </div>
        </div>

        {/* Active Runs — Unified component with live polling, actions, and empty state */}
        <ActiveRuns
          initialRuns={activeRuns}
          onRunsChanged={fetchAll}
          className="mb-6"
        />

        {/* Fleet Status Cards - Consolidated to 3 key cards */}
        <div className="mb-6 animate-slide-up-delay-2">
          <div className="flex items-center gap-2 mb-3">
            <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
              Fleet Status
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* System Health - Combined Gateway + Auth + Sessions */}
            <div className="rounded-xl border border-border bg-card/80 backdrop-blur-sm p-4">
              <div className="flex items-center gap-2 mb-3">
                <Cpu className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-medium">System Health</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">AI Gateway</span>
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      'h-2 w-2 rounded-full',
                      relayReachable === null ? 'bg-yellow-500 animate-pulse' :
                      relayReachable ? 'bg-emerald-500' : 'bg-red-500'
                    )} />
                    <span className="text-xs font-medium">
                      {relayReachable === null ? 'Checking...' : relayReachable ? 'Reachable' : 'Down'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Authentication</span>
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      'h-2 w-2 rounded-full',
                      tokenValid === null ? 'bg-yellow-500 animate-pulse' :
                      tokenValid ? 'bg-emerald-500' : 'bg-red-500'
                    )} />
                    <span className="text-xs font-medium">
                      {tokenValid === null ? 'Checking...' : tokenValid ? 'Valid' : 'Invalid'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                  <span className="text-xs text-muted-foreground">Active Sessions</span>
                  <span className="text-sm font-bold font-mono">{attachedTabs}</span>
                </div>
              </div>
            </div>

            {/* Workload Status - Combined Active Runs + Fleet State */}
            <div className="rounded-xl border border-border bg-card/80 backdrop-blur-sm p-4">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-medium">Workload Status</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Running & Queued</span>
                  <span className="text-sm font-bold font-mono">{activeRuns.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Fleet State</span>
                  <Badge variant={fleetPaused ? 'secondary' : 'default'} className="text-[10px]">
                    {fleetPaused ? (
                      <Pause className="h-3 w-3 mr-1" />
                    ) : (
                      <Play className="h-3 w-3 mr-1" />
                    )}
                    {fleetPaused ? 'PAUSED' : 'ACTIVE'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                  <span className="text-xs text-muted-foreground">Recent Events</span>
                  <span className="text-sm font-bold font-mono">{recentEventsCount}</span>
                </div>
              </div>
            </div>

            {/* Performance Snapshot */}
            <div className="rounded-xl border border-border bg-card/80 backdrop-blur-sm p-4">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-medium">Performance</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Auto-Improvements</span>
                  <span className="text-sm font-bold font-mono text-[color:var(--foco-teal)]">{autonomousStats.improvementsWeek}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Success Rate</span>
                  <span className="text-xs font-medium">
                    {allRuns.length > 0 
                      ? `${Math.round((allRuns.filter(r => r.status === 'completed').length / allRuns.length) * 100)}%` 
                      : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                  <span className="text-xs text-muted-foreground">G1 Alignment</span>
                  <span className="text-xs font-medium text-emerald-500">
                    {allRuns.length > 0 
                      ? `${Math.round((allRuns.filter(r => /revenue|customer|sales|onboard|trial/i.test((r.runner || '') + ' ' + (r.task_id || ''))).length / allRuns.length) * 100)}%` 
                      : '—'}
                  </span>
                </div>
              </div>
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

        {/* Recent Events / Execution Summary - Two column layout */}
        <div className="grid md:grid-cols-2 gap-6 mb-6 animate-slide-up-delay-2">

          {/* Quick Stats / Info Panel */}
          <div className="rounded-xl border border-border bg-card/80 backdrop-blur-sm">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="text-sm font-semibold">Execution Summary</h3>
              <Button variant="ghost" size="sm" onClick={() => router.push('/runs')}>
                View all runs
              </Button>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total runs today</span>
                <span className="text-sm font-medium">{allRuns.filter(r => r.started_at && new Date(r.started_at).toDateString() === new Date().toDateString()).length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Completed successfully</span>
                <span className="text-sm font-medium text-emerald-500">{allRuns.filter(r => r.status === 'completed').length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Failed / Cancelled</span>
                <span className="text-sm font-medium text-red-500">{allRuns.filter(r => r.status === 'failed' || r.status === 'cancelled').length}</span>
              </div>
              <div className="pt-2 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => router.push('/runs/new')}
                >
                  <Play className="h-3.5 w-3.5 mr-1.5" />
                  Start new run
                </Button>
              </div>
            </div>
          </div>

          {/* Recent Ledger Events */}
          <div className="rounded-xl border border-border bg-card/80 backdrop-blur-sm">
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

        
      </PageShell>
    </ErrorBoundary>
  )
}
