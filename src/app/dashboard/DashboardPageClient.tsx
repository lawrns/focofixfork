'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
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
  RefreshCw,
} from 'lucide-react'
import { TooltipProvider } from '@/components/ui/tooltip'

import { useDashboardData, type LedgerEvent } from '@/components/dashboard/use-dashboard-data'
import { StrategicBanner } from '@/components/dashboard/strategic-banner'
import { CommandInput, type DispatchResult } from '@/components/dashboard/command-input'
import { StatPillsBar } from '@/components/dashboard/stat-pills-bar'
import { RunCardGrid } from '@/components/dashboard/run-card-grid'
import { RecentEventsFeed } from '@/components/dashboard/recent-events-feed'
import { useRunStream } from '@/hooks/use-run-stream'
import type { TerminalLine } from '@/components/dashboard/run-card'

const AIInsights = dynamic(
  () => import('@/components/dashboard/AIInsights').then((m) => m.AIInsights),
  { ssr: false, loading: () => null }
)

const SHARED_SPRING = { type: 'spring', stiffness: 300, damping: 30 }

type RibbonState = {
  agent: string
  task: string
  runId?: string
  jobId?: string
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

function RunCardStreamBridge({
  runId,
  jobId,
  onStreamUpdate,
}: {
  runId: string
  jobId: string | null
  onStreamUpdate: (
    runId: string,
    stream: {
      lines: TerminalLine[]
      connectionState: 'idle' | 'resolving' | 'connecting' | 'live' | 'ended' | 'unavailable'
    }
  ) => void
}) {
  const { lines, connectionState } = useRunStream(runId, jobId)
  const prevStateRef = useRef('')

  useEffect(() => {
    const nextState = `${connectionState}:${lines.length}`
    if (nextState !== prevStateRef.current) {
      prevStateRef.current = nextState
      onStreamUpdate(runId, { lines, connectionState })
    }
  }, [connectionState, lines, onStreamUpdate, runId])

  return null
}

export default function DashboardPageClient() {
  const router = useRouter()
  const { user, loading } = useAuth()

  const data = useDashboardData(user)

  const [showStrategicBanner, setShowStrategicBanner] = useState(true)
  const [dispatching, setDispatching] = useState(false)
  const [ribbon, setRibbon] = useState<RibbonState | null>(null)
  const [pendingFlash, setPendingFlash] = useState(false)
  const [dispatchFlash, setDispatchFlash] = useState(false)
  const [fleetExpanded, setFleetExpanded] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<LedgerEvent | null>(null)

  const [terminalLinesMap, setTerminalLinesMap] = useState<Record<string, TerminalLine[]>>({})
  const [streamStateMap, setStreamStateMap] = useState<Record<string, 'idle' | 'resolving' | 'connecting' | 'live' | 'ended' | 'unavailable'>>({})

  useEffect(() => {
    document.title = 'Dashboard | Critter'
  }, [])

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  const handleStreamUpdate = useCallback((
    runId: string,
    stream: {
      lines: TerminalLine[]
      connectionState: 'idle' | 'resolving' | 'connecting' | 'live' | 'ended' | 'unavailable'
    }
  ) => {
    setTerminalLinesMap((prev) => ({ ...prev, [runId]: stream.lines }))
    setStreamStateMap((prev) => ({ ...prev, [runId]: stream.connectionState }))
  }, [])

  const handleDispatch = useCallback(async (args: {
    task: string
    persona: string
    agentId: string
    personaLabel: string
  }): Promise<DispatchResult> => {
    setDispatching(true)
    setDispatchFlash(true)
    setTimeout(() => setDispatchFlash(false), 300)

    try {
      const response = await fetch('/api/command-surface/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: args.task,
          mode: args.persona,
          project_id: data.selectedProjectId || null,
        }),
      })

      const ribbonState: RibbonState = { agent: args.agentId, task: args.task }
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null
        return { ok: false, error: payload?.error ?? `Dispatch failed (${response.status})` }
      }

      const payload = await response.json()
      ribbonState.jobId = typeof payload?.job_id === 'string' ? payload.job_id : undefined

      setRibbon(ribbonState)
      setPendingFlash(true)
      setTimeout(() => setPendingFlash(false), 850)
      setTimeout(() => setRibbon(null), 4600)
      setTimeout(() => {
        void data.fetchAll()
      }, 500)
      return { ok: true, jobId: ribbonState.jobId }
    } catch {
      return { ok: false, error: 'Dispatch failed due to a network or gateway error' }
    } finally {
      setDispatching(false)
    }
  }, [data])

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
        <PageShell className="space-y-3 bg-gradient-to-b from-background to-muted/20 rounded-xl p-2">
          <PageHeader
            title="Execution Dashboard"
            subtitle="Mission control for operator + agent execution"
            primaryAction={
              <Button variant="outline" size="sm" onClick={() => data.fetchAll()} disabled={data.refreshing} className="h-8 gap-1.5">
                <RefreshCw className={cn('h-3.5 w-3.5', data.refreshing && 'animate-spin')} />
                Refresh
              </Button>
            }
          />

          <StrategicBanner visible={showStrategicBanner} onDismiss={() => setShowStrategicBanner(false)} />

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

          <StatPillsBar
            runningCount={data.runningCount}
            pendingCount={data.pendingCount}
            doneCount={data.doneCount}
            failedCount={data.failedCount}
            staleCount={data.staleCount}
            fleetPaused={data.fleetPaused}
            pendingFlash={pendingFlash}
          />

          {/* Fleet Status Accordion */}
          <div className="rounded-xl border bg-card/80">
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

          {/* Main 2-column layout: RunCards + Recent Events */}
          <div className="grid grid-cols-1 md:grid-cols-[3fr_2fr] gap-4">
            <div>
              <RunCardGrid
                runs={data.activeRuns}
                terminalLinesMap={terminalLinesMap}
                connectionStatesMap={streamStateMap}
                onDispatchClick={() => {
                  // Focus the command input — scroll up
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
              />
              {/* Stream bridges for each active run */}
              {data.activeRuns.map((run) => (
                <RunCardStreamBridge
                  key={run.id}
                  runId={run.id}
                  jobId={null}
                  onStreamUpdate={handleStreamUpdate}
                />
              ))}
            </div>

            <div className="md:sticky md:top-20 md:self-start md:max-h-[calc(100vh-6rem)] md:overflow-auto">
              <RecentEventsFeed events={data.recentEvents} onSelect={setSelectedEvent} />
            </div>
          </div>

          <ErrorBoundary fallback={() => null}>
            <AIInsights userId={user.id} className="mb-1" runs={data.allRuns} recentEvents={data.recentEvents} />
          </ErrorBoundary>

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
        </PageShell>
      </TooltipProvider>
    </ErrorBoundary>
  )
}
