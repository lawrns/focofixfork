'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/use-auth'
import { PageShell } from '@/components/layout/page-shell'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import ErrorBoundary from '@/components/error/error-boundary'
import { CritterLaunchPadButton } from '@/components/critter/critter-launch-pad-button'
import dynamic from 'next/dynamic'

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
  Send,
  RefreshCw,
  Clock,
  Loader2,
  Zap,
  BookOpen,
  AlertTriangle,
} from 'lucide-react'

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

  // Quick dispatch state
  const [dispatchAgent, setDispatchAgent] = useState('')
  const [dispatchTask, setDispatchTask] = useState('')
  const [dispatching, setDispatching] = useState(false)

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

  const handleDispatch = async () => {
    if (!dispatchAgent.trim() || !dispatchTask.trim()) return
    setDispatching(true)
    try {
      const res = await fetch('/api/openclaw-gateway/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id: dispatchAgent, task: dispatchTask }),
      })
      if (res.ok) {
        setDispatchAgent('')
        setDispatchTask('')
        fetchAll()
      }
    } catch {
      // silent
    } finally {
      setDispatching(false)
    }
  }

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
          title="Dashboard"
          subtitle="Fleet overview"
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

        {/* Fleet Status Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {/* Relay */}
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Cpu className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium">Relay</span>
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
              <span className="text-xs text-muted-foreground font-medium">Token</span>
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

          {/* Tabs */}
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Cpu className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium">Tabs</span>
            </div>
            <span className="text-2xl font-bold font-mono">{attachedTabs}</span>
          </div>

          {/* Active runs */}
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium">Active Runs</span>
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
              <h3 className="text-sm font-semibold">Active Runs</h3>
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

        {/* Quick Dispatch */}
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Send className="h-4 w-4 text-[color:var(--foco-teal)]" />
            Quick Dispatch
          </h3>
          {relayReachable === false || tokenValid === false ? (
            <div className="flex items-start gap-2 mb-3 rounded-md border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-3 text-sm text-red-700 dark:text-red-400">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>
                {relayReachable === false ? 'Relay unreachable' : 'Token invalid'} — dispatch unavailable.
              </span>
            </div>
          ) : null}
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              placeholder="Agent ID"
              value={dispatchAgent}
              onChange={(e) => setDispatchAgent(e.target.value)}
              className="sm:w-40"
            />
            <Input
              placeholder="Task description"
              value={dispatchTask}
              onChange={(e) => setDispatchTask(e.target.value)}
              className="flex-1"
              onKeyDown={(e) => e.key === 'Enter' && handleDispatch()}
            />
            <CritterLaunchPadButton
              label={dispatching ? 'Dispatching...' : 'Dispatch'}
              variant="default"
              size="sm"
              disabled={dispatching || !dispatchAgent.trim() || !dispatchTask.trim() || relayReachable === false || tokenValid === false}
              onClick={handleDispatch}
            />
          </div>
        </div>
      </PageShell>
    </ErrorBoundary>
  )
}
