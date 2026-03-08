'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/lib/hooks/use-auth'
import { PageShell } from '@/components/layout/page-shell'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import ErrorBoundary from '@/components/error/error-boundary'
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  FolderKanban,
  RefreshCw,
  Send,
} from 'lucide-react'
import { TooltipProvider } from '@/components/ui/tooltip'

import { AutonomySummaryBar } from '@/components/autonomy/autonomy-summary-bar'
import { useDashboardData, type LedgerEvent } from '@/components/dashboard/use-dashboard-data'
import { StrategicBanner } from '@/components/dashboard/strategic-banner'
import { CommandInput, type DispatchResult } from '@/components/dashboard/command-input'
import { StatPillsBar } from '@/components/dashboard/stat-pills-bar'
import { RunCardGrid } from '@/components/dashboard/run-card-grid'
import { RecentEventsFeed } from '@/components/dashboard/recent-events-feed'
import { PriorityFeed } from '@/components/dashboard/priority-feed'
import { AttentionCountBadge } from '@/components/dashboard/attention-count-badge'
import { useRunStream } from '@/hooks/use-run-stream'
import type { TerminalLine } from '@/components/dashboard/run-card'
import type { Run } from '@/components/dashboard/use-dashboard-data'
import type { AgentExecutionStatus } from '@/components/command-surface/types'
import { redactSensitiveText } from '@/lib/security/redaction'
import { useUserModelPreferences } from '@/lib/stores/user-model-preferences'

const AIInsights = dynamic(
  () => import('@/components/dashboard/AIInsights').then((m) => m.AIInsights),
  { ssr: false, loading: () => null }
)

const SHARED_SPRING = { type: 'spring', stiffness: 300, damping: 30 }
const DASHBOARD_VIEWS = ['dispatch', 'work', 'proposals', 'runs', 'activity'] as const

type DashboardView = (typeof DASHBOARD_VIEWS)[number]

type RibbonState = {
  agent: string
  task: string
  runId?: string
  jobId?: string
}

type StreamUpdate = {
  lines: TerminalLine[]
  status: AgentExecutionStatus | null
  connectionState: 'idle' | 'resolving' | 'connecting' | 'live' | 'ended' | 'unavailable'
}

function makeTerminalLine(token: TerminalLine['token'], text: string): TerminalLine {
  return {
    id: `${Date.now()}-${Math.random()}`,
    token,
    text,
    ts: Date.now(),
  }
}

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const s = Math.max(1, Math.floor(ms / 1000))
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function normalizeDashboardView(value: string | null): DashboardView | null {
  if (!value) return null
  return (DASHBOARD_VIEWS as readonly string[]).includes(value) ? (value as DashboardView) : null
}

function summarizeDispatch(task: string): string {
  return `[DASHBOARD] ${redactSensitiveText(task).slice(0, 140)}`
}

function mapExecutionStatusToRunStatus(status: AgentExecutionStatus): 'pending' | 'running' | 'completed' | 'failed' {
  switch (status) {
    case 'queued':
      return 'pending'
    case 'executing':
      return 'running'
    case 'completed':
      return 'completed'
    case 'error':
      return 'failed'
  }
}

function RunCardStreamBridge({
  runId,
  jobId,
  onStreamUpdate,
}: {
  runId: string
  jobId: string | null
  onStreamUpdate: (
    runId: string,
    stream: StreamUpdate
  ) => void
}) {
  const { lines, status, connectionState } = useRunStream(runId, jobId)
  const prevStateRef = useRef('')

  useEffect(() => {
    const nextState = `${connectionState}:${status ?? 'none'}:${lines.length}`
    if (nextState !== prevStateRef.current) {
      prevStateRef.current = nextState
      onStreamUpdate(runId, { lines, status, connectionState })
    }
  }, [connectionState, lines, onStreamUpdate, runId, status])

  return null
}

export default function DashboardPageClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading } = useAuth()
  const selectedView = normalizeDashboardView(searchParams?.get('view') ?? null)
  const {
    defaultModel,
    fallbackChain,
    plannerModel: preferredPlannerModel,
    executorModel: preferredExecutorModel,
    reviewerModel: preferredReviewerModel,
  } = useUserModelPreferences()

  const data = useDashboardData(user)

  const [showStrategicBanner, setShowStrategicBanner] = useState(true)
  const [dispatching, setDispatching] = useState(false)
  const [ribbon, setRibbon] = useState<RibbonState | null>(null)
  const [pendingFlash, setPendingFlash] = useState(false)
  const [dispatchFlash, setDispatchFlash] = useState(false)
  const [fleetExpanded, setFleetExpanded] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<LedgerEvent | null>(null)
  const [activeView, setActiveView] = useState<DashboardView>(selectedView ?? 'dispatch')
  const [blockedSheetOpen, setBlockedSheetOpen] = useState(false)

  const [syntheticRuns, setSyntheticRuns] = useState<Run[]>([])
  const [terminalLinesMap, setTerminalLinesMap] = useState<Record<string, TerminalLine[]>>({})
  const [streamStateMap, setStreamStateMap] = useState<Record<string, 'idle' | 'resolving' | 'connecting' | 'live' | 'ended' | 'unavailable'>>({})
  const [runJobMap, setRunJobMap] = useState<Record<string, string>>({})
  const dispatchRef = useRef<HTMLDivElement>(null)
  const proposalsRef = useRef<HTMLDivElement>(null)
  const runsRef = useRef<HTMLDivElement>(null)
  const activityRef = useRef<HTMLDivElement>(null)
  const persistedRunStatusRef = useRef<Record<string, string>>({})

  useEffect(() => {
    document.title = 'Dashboard | Critter'
  }, [])

  useEffect(() => {
    if (selectedView) setActiveView(selectedView)
  }, [selectedView])

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  const handleStreamUpdate = useCallback((
    runId: string,
    stream: StreamUpdate
  ) => {
    setTerminalLinesMap((prev) => ({ ...prev, [runId]: stream.lines }))
    setStreamStateMap((prev) => ({ ...prev, [runId]: stream.connectionState }))

    if (!stream.status) return

    const nextStatus = mapExecutionStatusToRunStatus(stream.status)
    if (persistedRunStatusRef.current[runId] === nextStatus) return
    persistedRunStatusRef.current[runId] = nextStatus

    setSyntheticRuns((prev) => prev.map((run) => (
      run.id === runId
        ? {
            ...run,
            status: nextStatus,
            started_at: nextStatus === 'running' ? run.started_at ?? new Date().toISOString() : run.started_at,
            ended_at: nextStatus === 'completed' || nextStatus === 'failed' ? new Date().toISOString() : run.ended_at,
          }
        : run
    )))

    void fetch(`/api/runs/${runId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: nextStatus,
        summary: stream.lines.length > 0
          ? summarizeDispatch(stream.lines[stream.lines.length - 1]?.text ?? '')
          : undefined,
      }),
    }).finally(() => {
      window.dispatchEvent(new Event('runs:mutated'))
    })
  }, [])

  const appendSyntheticLine = useCallback((runId: string, token: TerminalLine['token'], text: string) => {
    setTerminalLinesMap((prev) => ({
      ...prev,
      [runId]: [...(prev[runId] ?? []), makeTerminalLine(token, text)].slice(-120),
    }))
  }, [])

  const triggerDispatchArc = useCallback((run: Run, agentLabel: string, userTask: string, jobId?: string) => {
    const redactedTask = redactSensitiveText(userTask)
    setRibbon({ agent: agentLabel, task: redactedTask, runId: run.id, jobId })
    setPendingFlash(true)
    window.setTimeout(() => setPendingFlash(false), 850)

    setSyntheticRuns((prev) => {
      const nextRun: Run = {
        ...run,
        runner: run.runner || agentLabel,
        summary: run.summary || summarizeDispatch(redactedTask),
      }
      return [nextRun, ...prev.filter((item) => item.id !== run.id)].slice(0, 10)
    })

    if (jobId) {
      setRunJobMap((prev) => ({ ...prev, [run.id]: jobId }))
    }

    setStreamStateMap((prev) => ({ ...prev, [run.id]: 'resolving' }))
    appendSyntheticLine(run.id, 'INIT', `Dispatch accepted for ${agentLabel} (run ${run.id.slice(0, 8)})`)
    appendSyntheticLine(run.id, 'OBSERVE', 'Saved run created. Waiting for execution updates.')
  }, [appendSyntheticLine])

  const handleDispatch = useCallback(async (args: {
    task: string
    persona: string
    agentId: string
    personaLabel: string
    lane?: string
  }): Promise<DispatchResult> => {
    setDispatching(true)
    setDispatchFlash(true)
    setTimeout(() => setDispatchFlash(false), 300)

    try {
      const runResponse = await fetch('/api/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          runner: args.agentId || args.personaLabel,
          status: 'pending',
          summary: summarizeDispatch(args.task),
          project_id: data.selectedProjectId || null,
          trace: {
            ai_routing: {
              requested: {
                model: defaultModel,
                planner_model: preferredPlannerModel,
                executor_model: preferredExecutorModel,
                reviewer_model: preferredReviewerModel,
                fallback_chain: fallbackChain,
              },
            },
          },
        }),
      })

      if (!runResponse.ok) {
        const payload = await runResponse.json().catch(() => null) as { error?: string } | null
        return { ok: false, error: payload?.error ?? `Failed to create saved run (${runResponse.status})` }
      }

      const runPayload = await runResponse.json()
      const bootstrapRun = runPayload?.data as Run | undefined
      if (!bootstrapRun?.id) {
        return { ok: false, error: 'Saved run was not created' }
      }

      persistedRunStatusRef.current[bootstrapRun.id] = bootstrapRun.status

      const response = await fetch('/api/command-surface/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: args.task,
          mode: 'auto',
          project_id: data.selectedProjectId || null,
          selected_agents: args.agentId ? [args.agentId] : null,
          context: {
            persona: args.persona,
            source: 'dashboard',
            lane: args.lane ?? null,
          },
          bootstrap_run_id: bootstrapRun.id,
          requested_model: defaultModel,
          requested_planner_model: preferredPlannerModel,
          requested_executor_model: preferredExecutorModel,
          requested_reviewer_model: preferredReviewerModel,
          requested_fallback_chain: fallbackChain,
        }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null
        void fetch(`/api/runs/${bootstrapRun.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'failed', summary: summarizeDispatch(args.task) }),
        }).finally(() => {
          window.dispatchEvent(new Event('runs:mutated'))
        })
        return { ok: false, error: payload?.error ?? `Dispatch failed (${response.status})` }
      }

      const payload = await response.json()
      const jobId = typeof payload?.job_id === 'string' ? payload.job_id : undefined
      triggerDispatchArc(bootstrapRun, args.agentId || args.personaLabel, args.task, jobId)
      window.dispatchEvent(new Event('runs:mutated'))
      setTimeout(() => {
        void data.fetchAll()
      }, 800)
      return { ok: true, runId: bootstrapRun.id, jobId }
    } catch {
      return { ok: false, error: 'Dispatch failed due to a network or gateway error' }
    } finally {
      setDispatching(false)
    }
  }, [data, defaultModel, fallbackChain, preferredExecutorModel, preferredPlannerModel, preferredReviewerModel, triggerDispatchArc])

  const displayedRuns = (() => {
    const realIds = new Set(data.activeRuns.map((run) => run.id))
    return [
      ...syntheticRuns.filter((run) => !realIds.has(run.id) && (run.status === 'pending' || run.status === 'running')),
      ...data.activeRuns,
    ].slice(0, 10)
  })()
  const navigateToView = useCallback((view: DashboardView) => {
    setActiveView(view)
  }, [])
  const blockedWorkItems = data.workItems.filter((item) => item.status === 'blocked' || item.section === 'waiting')
  const blockedCount = blockedWorkItems.length + (data.fleetPaused ? 1 : 0)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!user) return null

  return (
    <ErrorBoundary>
      <TooltipProvider delayDuration={120}>
        <PageShell className="space-y-3 rounded-xl bg-gradient-to-b from-background to-muted/20 px-1 py-2 sm:px-2 lg:px-3">
          <PageHeader
            title="Overview"
            subtitle="What happened, what needs attention, and what the cofounder is doing now."
            primaryAction={
              <div className="flex items-center gap-2">
                <AttentionCountBadge count={data.attentionCount} />
                <Button variant="outline" size="sm" onClick={() => data.fetchAll()} disabled={data.refreshing} className="h-8 gap-1.5">
                  <RefreshCw className={cn('h-3.5 w-3.5', data.refreshing && 'animate-spin')} />
                  Refresh
                </Button>
              </div>
            }
          />

          <AutonomySummaryBar />

          {/* While you slept strip — only shown when there is non-zero data */}
          {(data.doneCount > 0 || (data.autonomousStats?.improvementsWeek ?? 0) > 0 || data.proposals.filter((p) => p.status === 'pending_review').length > 0) && (
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground/70">Last 24h:</span>
              {data.doneCount > 0 && (
                <Badge variant="outline" className="h-6 gap-1 text-xs font-normal text-emerald-500 border-emerald-500/30">
                  {data.doneCount} runs completed
                </Badge>
              )}
              {(data.autonomousStats?.improvementsWeek ?? 0) > 0 && (
                <Badge variant="outline" className="h-6 gap-1 text-xs font-normal text-[color:var(--foco-teal)] border-[color:var(--foco-teal)]/30">
                  {data.autonomousStats.improvementsWeek} improvements
                </Badge>
              )}
              {data.proposals.filter((p) => p.status === 'pending_review').length > 0 && (
                <Badge variant="outline" className="h-6 gap-1 text-xs font-normal text-amber-500 border-amber-500/30">
                  {data.proposals.filter((p) => p.status === 'pending_review').length} proposals waiting
                </Badge>
              )}
            </div>
          )}

          <StrategicBanner visible={showStrategicBanner} onDismiss={() => setShowStrategicBanner(false)} />

          <div className="flex flex-wrap gap-2">
            {[
              { id: 'proposals', label: 'Proposals', icon: ClipboardList },
              { id: 'dispatch', label: 'Dispatch', icon: Send },
              { id: 'work', label: 'Work', icon: FolderKanban },
              { id: 'runs', label: 'Runs', icon: RefreshCw },
              { id: 'activity', label: 'Activity', icon: BookOpen },
            ].map((item) => {
              const Icon = item.icon
              const active = selectedView === item.id
              return (
                <Button
                  key={item.id}
                  type="button"
                  size="sm"
                  variant={active ? 'default' : 'outline'}
                  className="h-8 gap-1.5"
                  onClick={() => navigateToView(item.id as DashboardView)}
                  aria-label={`${item.label} view`}
                  aria-pressed={active}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </Button>
              )
            })}
          </div>

          <StatPillsBar
            runningCount={data.runningCount}
            pendingCount={data.pendingCount}
            doneCount={data.doneCount}
            failedCount={data.failedCount}
            staleCount={data.staleCount}
            blockedCount={blockedCount}
            fleetPaused={data.fleetPaused}
            pendingFlash={pendingFlash}
            onBlockedClick={() => setBlockedSheetOpen(true)}
          />

          <section
            ref={proposalsRef}
            id="proposals"
            className={cn(
              'scroll-mt-24 transition-colors',
              (activeView === 'proposals' || activeView === 'work') && 'ring-2 ring-[color:var(--foco-teal)]/40 rounded-xl'
            )}
            aria-label="Priority feed section"
          >
            <PriorityFeed
              proposals={data.proposals}
              workItems={data.workItems}
              runs={data.allRuns}
              agents={data.agents}
              onRetryRun={async (runId) => {
                try {
                  const res = await fetch(`/api/runs/${runId}/retry`, { method: 'POST' })
                  if (res.ok) window.dispatchEvent(new Event('runs:mutated'))
                } catch { /* handled in feed */ }
              }}
              maxItems={12}
            />
          </section>

          <div ref={dispatchRef} id="dispatch" className="scroll-mt-24">
            <CommandInput
              agents={data.agents}
              projectOptions={data.projectOptions}
              selectedProjectId={data.selectedProjectId}
              selectedProjectSlug={data.selectedProjectSlug}
              onProjectChange={data.setSelectedProjectId}
              onDispatch={handleDispatch}
              dispatching={dispatching}
              ribbon={ribbon}
              dispatchFlash={dispatchFlash}
            />
          </div>

          {/* Fleet Status Accordion */}
          <div
            className={cn(
              'rounded-xl border bg-card/80 transition-colors',
              activeView === 'dispatch' && 'ring-2 ring-[color:var(--foco-teal)]/40 border-[color:var(--foco-teal)]'
            )}
          >
            <button
              type="button"
              onClick={() => setFleetExpanded((prev) => !prev)}
              className="w-full flex items-center gap-2 px-3 py-2 text-left"
            >
              <Badge variant="outline" className="text-[10px]">AI Gateway · {data.gatewayStatus}</Badge>
              <Badge variant="outline" className="text-[10px]">Workload · {data.activeRuns.length} active</Badge>
              <Badge variant="outline" className="text-[10px]">Errors · {data.failedCount}</Badge>
              <span className="ml-auto text-xs text-muted-foreground">Fleet status</span>
              {fleetExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            <AnimatePresence initial={false}>
              {fleetExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={SHARED_SPRING}
                  className="overflow-hidden"
                >
                  <div className="grid gap-2 border-t p-3 md:grid-cols-3">
                    <div className="rounded-lg border p-3">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">System Health</p>
                      <p className="mt-2 text-sm font-medium">Gateway: {data.gatewayStatus}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Auth: {data.tokenValid ? 'Valid' : data.tokenValid === null ? 'Checking...' : 'Invalid'} · Sessions: {data.attachedTabs}
                      </p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Workload</p>
                      <p className="mt-2 text-sm font-medium">{data.runningCount} agents executing</p>
                      <p className="mt-1 text-xs text-muted-foreground">{data.pendingCount} pending · {data.failedCount} failed</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Performance</p>
                      <p className="mt-2 text-sm font-medium">Auto improvements: {data.autonomousStats.improvementsWeek}</p>
                      <p className="mt-1 text-xs text-muted-foreground">G1 alignment: {data.g1Share === null ? '\u2014' : `${data.g1Share}%`}</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(22rem,0.95fr)_minmax(18rem,0.8fr)]">
            <div
              ref={runsRef}
              id="runs"
              className={cn(
                'space-y-4 scroll-mt-24 rounded-xl transition-colors',
                activeView === 'runs' && 'ring-2 ring-[color:var(--foco-teal)]/40'
              )}
              aria-label="Runs section"
            >
              <RunCardGrid
                runs={displayedRuns}
                totalRuns={Math.max(displayedRuns.length, data.activeRuns.length)}
                terminalLinesMap={terminalLinesMap}
                connectionStatesMap={streamStateMap}
                onDispatchClick={() => {
                  // Focus the command input — scroll up
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
              />
              {/* Stream bridges for each active run */}
              {displayedRuns.map((run) => (
                <RunCardStreamBridge
                  key={run.id}
                  runId={run.id}
                  jobId={runJobMap[run.id] ?? null}
                  onStreamUpdate={handleStreamUpdate}
                />
              ))}
            </div>

            <div
              ref={activityRef}
              id="activity"
              className={cn(
                'space-y-4 scroll-mt-24 rounded-xl transition-colors',
                activeView === 'activity' && 'ring-2 ring-[color:var(--foco-teal)]/40'
              )}
              aria-label="Activity section"
            >
              <RecentEventsFeed events={data.recentEvents} totalEvents={data.recentEvents.length} onSelect={setSelectedEvent} />
            </div>

            <div className="space-y-4 xl:sticky xl:top-20 xl:self-start">
              <ErrorBoundary fallback={() => null}>
                <AIInsights userId={user.id} className="mb-0" runs={data.allRuns} recentEvents={data.recentEvents} />
              </ErrorBoundary>
            </div>
          </div>

          <Sheet open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
            <SheetContent side="right" className="w-full sm:max-w-xl overflow-auto">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Event Replay
                </SheetTitle>
                <SheetDescription>
                  {selectedEvent?.type} · {selectedEvent ? relativeTime(selectedEvent.timestamp) : ''}
                </SheetDescription>
              </SheetHeader>

              {selectedEvent && (
                <div className="mt-4 space-y-3">
                  <div className="rounded-md border p-3">
                    <p className="text-sm font-medium">{selectedEvent.type}</p>
                    {selectedEvent.source && <p className="mt-1 text-xs text-muted-foreground">{selectedEvent.source}</p>}
                  </div>

                  <div className="rounded-md border bg-zinc-950 p-3 font-mono text-xs text-zinc-200">
                    <div className="text-[#22d3ee]">[INIT]  ingest event {selectedEvent.id.slice(0, 8)}</div>
                    <div className="text-[#60a5fa] mt-1">[OBSERVE] type={selectedEvent.type} source={selectedEvent.source || 'system'}</div>
                    <div className="text-[#fbbf24] mt-1">[ACTION] derive routing and policy annotations</div>
                    <div className="text-[#34d399] mt-1">[RESULT] event ready for operator decision</div>
                  </div>

                  <details className="rounded-md border p-3">
                    <summary className="cursor-pointer text-xs font-medium">Raw payload</summary>
                    <pre className="mt-2 max-h-[320px] overflow-auto rounded bg-muted p-2 text-[10px]">{JSON.stringify(selectedEvent.payload ?? {}, null, 2)}</pre>
                  </details>
                </div>
              )}
            </SheetContent>
          </Sheet>

          <Sheet open={blockedSheetOpen} onOpenChange={setBlockedSheetOpen}>
            <SheetContent side="right" className="w-full sm:max-w-xl overflow-auto">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <ChevronUp className="h-4 w-4" />
                  Blocked Details
                </SheetTitle>
                <SheetDescription>
                  {blockedCount === 0 ? 'Nothing is currently blocked.' : `${blockedCount} blocking issue${blockedCount === 1 ? '' : 's'} need attention.`}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-4 space-y-4">
                <div className="rounded-md border p-3">
                  <p className="text-sm font-medium">Fleet status</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {data.fleetPaused
                      ? 'The fleet is paused. New work may queue without active execution until the pause is cleared.'
                      : 'The fleet is running. Current blocked items come from work status, not a fleet-wide pause.'}
                  </p>
                </div>

                <div className="rounded-md border p-3">
                  <p className="text-sm font-medium">Blocked work items</p>
                  {blockedWorkItems.length === 0 ? (
                    <p className="mt-1 text-sm text-muted-foreground">No work items are marked blocked or waiting.</p>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {blockedWorkItems.map((item) => (
                        <div key={item.id} className="rounded-md border bg-muted/30 p-3">
                          <p className="text-sm font-medium">{item.title}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {item.project?.name ?? 'No project'} · {(item.section ?? item.status).replace(/_/g, ' ')}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {blockedCount > 0 ? (
                  <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-muted-foreground">
                    Use the Work section to reprioritize blocked items, or the Empire section if the fleet itself is paused.
                  </div>
                ) : null}
              </div>
            </SheetContent>
          </Sheet>
        </PageShell>
      </TooltipProvider>
    </ErrorBoundary>
  )
}
