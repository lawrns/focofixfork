'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { PageShell } from '@/components/layout/page-shell'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { EmpireHealthGrid } from '@/components/empire/empire-health-grid'
import { DiagramContainer } from '@/components/command-center/diagram/diagram-container'
import { AgentDetailSheet } from '@/components/command-center/panels/agent-detail-sheet'
import { CreateMissionDialog } from '@/components/command-center/dialogs/create-mission-dialog'
import { AgentTable } from '@/components/command-center/tables/agent-table'
import { MissionTable } from '@/components/command-center/tables/mission-table'
import { RunsTable } from '@/components/command-center/tables/runs-table'
import { LogsPanel } from '@/components/command-center/tables/logs-panel'
import { MobileCommandView } from '@/components/command-center/mobile/mobile-command-view'
import { SystemPulseChart } from '@/components/command-center/orchestrator/system-pulse-chart'
import { DecisionRow } from '@/components/command-center/orchestrator/decision-row'
import { AgentResourceRow } from '@/components/command-center/orchestrator/agent-resource-row'
import { QuickActionsCard } from '@/components/command-center/orchestrator/quick-actions-card'
import { GuardrailsCard } from '@/components/command-center/orchestrator/guardrails-card'
import { useCommandCenterStore } from '@/lib/stores/command-center-store'
import { RefreshCw, Plus, Cpu, AlertCircle, Pause, Play, Settings, Flag, Target } from 'lucide-react'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { AnimatePresence } from 'framer-motion'

function Tip({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent className="text-xs max-w-[220px]">{label}</TooltipContent>
    </Tooltip>
  )
}
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface ServiceStatus {
  name: string
  status: 'up' | 'down' | 'degraded'
  latencyMs?: number
  detail?: string
  url: string
}

const AGENT_POLL_INTERVAL = 10_000
const DECISIONS_POLL_INTERVAL = 15_000

export function CommandCenterClient() {
  const store = useCommandCenterStore()
  const searchParams = useSearchParams()
  const agentParamHandled = useRef(false)
  const [missionDialogOpen, setMissionDialogOpen] = useState(false)
  const [services, setServices] = useState<ServiceStatus[]>([])
  const [healthLoading, setHealthLoading] = useState(true)
  const [globalSearch, setGlobalSearch] = useState('')

  // ── Agent polling ────────────────────────────────────────────────────────────
  const { setAgents, setMissions, setError, setDecisions, approveDecision } = store
  const fetchAgents = useCallback(async (signal?: AbortSignal) => {
    try {
      const [agentRes, missionRes] = await Promise.allSettled([
        fetch('/api/command-center/agents', { signal }),
        fetch('/api/command-center/missions', { signal }),
      ])

      if (agentRes.status === 'fulfilled' && agentRes.value.ok) {
        const json = await agentRes.value.json()
        setAgents(json.agents ?? [])
        if (json.errors?.length) setError(json.errors.join('; '))
        else setError(null)
      }

      if (missionRes.status === 'fulfilled' && missionRes.value.ok) {
        const json = await missionRes.value.json()
        setMissions(json.missions ?? [])
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setError('Failed to fetch agent data')
    }
  }, [setAgents, setMissions, setError])

  // ── Decisions polling ─────────────────────────────────────────────────────────
  const fetchDecisions = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await fetch('/api/command-center/decisions', { signal })
      if (res.ok) {
        const json = await res.json()
        setDecisions(json.decisions ?? [])
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
    }
  }, [setDecisions])

  useEffect(() => {
    if (store.paused) return
    const controller = new AbortController()
    fetchAgents(controller.signal)
    const id = setInterval(() => fetchAgents(controller.signal), AGENT_POLL_INTERVAL)
    return () => { controller.abort(); clearInterval(id) }
  }, [fetchAgents, store.paused])

  useEffect(() => {
    if (store.paused) return
    const controller = new AbortController()
    fetchDecisions(controller.signal)
    const id = setInterval(() => fetchDecisions(controller.signal), DECISIONS_POLL_INTERVAL)
    return () => { controller.abort(); clearInterval(id) }
  }, [fetchDecisions, store.paused])

  // ── Auto-open agent from ?agent= query param ─────────────────────────────────
  useEffect(() => {
    if (agentParamHandled.current) return
    const agentId = searchParams.get('agent')
    if (!agentId || store.agents.length === 0) return
    const match = store.agents.find(a => a.id === agentId || a.nativeId === agentId)
    if (match) {
      store.selectAgent(match.id)
      agentParamHandled.current = true
    }
  }, [searchParams, store.agents, store])

  // ── Mode persistence ─────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/command-center/mode')
      .then(r => r.json())
      .then(data => { if (data.mode) store.setMode(data.mode) })
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleModeChange = useCallback(async (mode: 'Reactive' | 'Predictive' | 'Guarded') => {
    const prev = store.mode
    store.setMode(mode)
    try {
      const res = await fetch('/api/command-center/mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      })
      if (!res.ok) store.setMode(prev)
    } catch {
      store.setMode(prev)
    }
  }, [store])

  // ── Health tiles ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setHealthLoading(true)
      try {
        const res = await fetch('/api/empire/health')
        if (res.ok) {
          const json = await res.json()
          setServices(json.services ?? [])
        }
      } catch {
        // ignore
      } finally {
        setHealthLoading(false)
      }
    }
    load()
  }, [])

  // ── Metrics ──────────────────────────────────────────────────────────────────
  const agentCount = store.agents.length
  const workingCount = store.agents.filter(a => a.status === 'working').length
  const blockedCount = store.agents.filter(a => a.status === 'blocked').length
  const errorCount = store.agents.filter(a => a.status === 'error').length
  const decisionsCount = store.decisions.length

  // Agents that are "working" but haven't reported progress in >30 min
  const staleCount = store.agents.filter(a => {
    if (a.status !== 'working' || !a.lastActiveAt) return false
    const minsIdle = Math.floor((Date.now() - new Date(a.lastActiveAt).getTime()) / 60000)
    return minsIdle >= 30
  }).length

  // ── Filtering ────────────────────────────────────────────────────────────────
  const filteredAgents = globalSearch
    ? store.agents.filter(a => a.name.toLowerCase().includes(globalSearch.toLowerCase()))
    : store.agents

  const filteredDecisions = store.decisions.filter(d => {
    if ((store.quietMode || store.quietCategories.p3) && d.severity === 'P3') return false
    if (globalSearch && !d.title.toLowerCase().includes(globalSearch.toLowerCase())) return false
    return true
  })

  const MODE_TIPS: Record<string, string> = {
    Reactive: 'Fast response, minimal guardrails',
    Predictive: 'Balanced safety and performance',
    Guarded: 'Maximum safety, all actions need approval',
  }

  return (
    <TooltipProvider delayDuration={200}>
    <PageShell>
      <PageHeader
        title="Execution Command Center"
        subtitle="Run agents with explicit Goal 1 focus and visible outcomes"
        primaryAction={
          <div className="flex items-center gap-2">
            {store.error && (
              <div className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400">
                <AlertCircle className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{store.error}</span>
              </div>
            )}
            <Badge variant="outline" className="hidden sm:inline-flex gap-1 text-[11px]">
              <span className={cn(
                'h-1.5 w-1.5 rounded-full',
                workingCount > 0 ? 'bg-teal-400' : 'bg-zinc-400'
              )} />
              {workingCount}/{agentCount} active
            </Badge>
            <Tip label="Fetch latest data">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchAgents()}
                disabled={store.isLoading}
                className="gap-1.5"
              >
                <RefreshCw className={cn('h-3.5 w-3.5', store.isLoading && 'animate-spin')} />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
            </Tip>
            <Tip label="Create a new agent mission">
              <Button
                size="sm"
                onClick={() => setMissionDialogOpen(true)}
                className="gap-1.5 bg-[color:var(--foco-teal)] hover:bg-[color:var(--foco-teal)]/90"
              >
                <Plus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Mission</span>
              </Button>
            </Tip>
          </div>
        }
      />

      <div className="mb-4 rounded-lg border border-zinc-200/80 dark:border-zinc-800 bg-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-zinc-500 font-medium">Strategic Rule</p>
            <h2 className="text-sm font-semibold mt-1">Command → action → outcome must be visible and tied to revenue goals.</h2>
            <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-1">
              Prefer missions that support customer activation, retention, and measurable weekly progress.
            </p>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="text-[11px] border-emerald-300 text-emerald-700 bg-emerald-500/10">
              <Flag className="h-3 w-3 mr-1" />
              G1 Priority
            </Badge>
            <Badge variant="outline" className="text-[11px] border-blue-300 text-blue-700 bg-blue-500/10">
              <Target className="h-3 w-3 mr-1" />
              Trust Through Visibility
            </Badge>
          </div>
        </div>
      </div>

      {/* Health tiles */}
      <EmpireHealthGrid services={services} loading={healthLoading} />

      {/* NEW: Mode + Search + Controls TopBar */}
      <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg border bg-card">
        {/* Mode button group */}
        <div className="inline-flex h-8 items-center rounded-md bg-muted/30 p-1 gap-1 shrink-0">
          {(['Reactive', 'Predictive', 'Guarded'] as const).map((mode) => (
            <Tip key={mode} label={MODE_TIPS[mode]}>
              <Button
                size="xs"
                variant={store.mode === mode ? 'default' : 'ghost'}
                className={cn('text-[11px] px-2 h-6', store.mode === mode && 'bg-background shadow-sm')}
                onClick={() => handleModeChange(mode)}
              >
                {mode}
              </Button>
            </Tip>
          ))}
        </div>

        {/* Search */}
        <Input
          placeholder="Search agents & decisions..."
          value={globalSearch}
          onChange={(e) => setGlobalSearch(e.target.value)}
          className="h-8 max-w-xs text-[12px]"
        />

        {/* Pause button */}
        <Tip label={store.paused ? 'Resume agent operations' : 'Pause all agent operations'}>
          <Button
            size="xs"
            variant={store.paused ? 'default' : 'outline'}
            className={cn('h-8 gap-1', store.paused && 'bg-rose-600 hover:bg-rose-700')}
            onClick={() => store.setPaused(!store.paused)}
          >
            {store.paused ? (
              <>
                <Play className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Resume</span>
              </>
            ) : (
              <>
                <Pause className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Pause</span>
              </>
            )}
          </Button>
        </Tip>

        {/* Controls dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="xs" variant="outline" className="h-8 w-8 p-0" title="Orchestration controls">
              <Settings className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => store.setQuietMode(!store.quietMode)}>
              {store.quietMode ? 'Disable' : 'Enable'} Quiet Mode
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => fetchAgents()}>
              Refresh Now
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* NEW: KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Tip label="Agents currently executing tasks">
          <div className="rounded-lg border bg-card p-3 space-y-1">
            <div className="text-[10px] text-muted-foreground font-mono">Active agents</div>
            <div className="text-2xl font-bold">{workingCount}</div>
          </div>
        </Tip>
        <Tip label="Actions pending human approval">
          <div className="rounded-lg border bg-card p-3 space-y-1">
            <div className="text-[10px] text-muted-foreground font-mono">Needs decision</div>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{decisionsCount}</div>
          </div>
        </Tip>
        <Tip label="Agents blocked and unable to proceed">
          <div className="rounded-lg border bg-card p-3 space-y-1">
            <div className="text-[10px] text-muted-foreground font-mono">Stuck</div>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{blockedCount}</div>
          </div>
        </Tip>
        <Tip label="Agents in error state">
          <div className="rounded-lg border bg-card p-3 space-y-1">
            <div className="text-[10px] text-muted-foreground font-mono">Failed</div>
            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">{errorCount}</div>
          </div>
        </Tip>
        <Tip label="Working agents with no progress update in 30+ minutes">
          <div className={cn(
            'rounded-lg border bg-card p-3 space-y-1',
            staleCount > 0 && 'border-amber-500/40',
          )}>
            <div className="text-[10px] text-muted-foreground font-mono">Stale (&gt;30m)</div>
            <div className={cn(
              'text-2xl font-bold',
              staleCount > 0 ? 'text-amber-500' : 'text-foreground',
            )}>{staleCount}</div>
          </div>
        </Tip>
      </div>

      {/* NEW: Main 2-col grid (System Pulse + Decisions) */}
      <div className="grid lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7 space-y-4">
          <SystemPulseChart />
          <QuickActionsCard services={services} />
        </div>
        <div className="lg:col-span-5 space-y-4">
          {/* Decision Queue */}
          <div className="rounded-lg border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Decision Queue</h3>
              {decisionsCount > 0 && (
                <Badge variant="outline" className="text-[10px]">{decisionsCount} pending</Badge>
              )}
            </div>

            {filteredDecisions.length > 0 ? (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                <AnimatePresence mode="popLayout">
                  {filteredDecisions.map(decision => (
                    <DecisionRow
                      key={decision.id}
                      decision={decision}
                      onApprove={() => approveDecision(decision.id, 'approve')}
                      onReject={() => approveDecision(decision.id, 'reject')}
                      onDefer={() => approveDecision(decision.id, 'defer')}
                    />
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="py-6 text-center text-[12px] text-muted-foreground">
                No pending decisions
              </div>
            )}
          </div>

          {/* Guardrails */}
          <GuardrailsCard />
        </div>
      </div>

      {/* NEW: Agent rows + System log 2-col grid */}
      <div className="grid lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7">
          <div className="rounded-lg border bg-card p-4 space-y-3">
            <h3 className="text-sm font-semibold">Active Agents</h3>
            {filteredAgents.length > 0 ? (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {filteredAgents.map(agent => (
                  <AgentResourceRow
                    key={agent.id}
                    agent={agent}
                    onKill={() => store.stopAgent(agent.backend, agent.nativeId)}
                  />
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-[12px] text-muted-foreground">
                No active agents
              </div>
            )}
          </div>
        </div>
        <div className="lg:col-span-5">
          {/* System Log */}
          <LogsPanel />
        </div>
      </div>

      {/* Swarm topology — hidden on mobile */}
      <div className="hidden md:block">
        <div className="rounded-lg border overflow-hidden" style={{ minHeight: '260px' }}>
          <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/30">
            <Cpu className="h-4 w-4 text-muted-foreground" />
            <span className="text-[12px] font-mono uppercase tracking-wide text-muted-foreground">
              Swarm topology
            </span>
            {store.isLoading && (
              <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground ml-auto" />
            )}
          </div>
          <DiagramContainer className="min-h-[200px]" />
        </div>
      </div>

      {/* Mobile swarm view */}
      <div className="md:hidden">
        <MobileCommandView />
      </div>

      {/* Detail tabs */}
      <Tabs defaultValue="agents">
        <TabsList>
          <TabsTrigger value="agents" title="All registered agents and their status">
            Agents
            {agentCount > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-[10px] px-1 py-0 h-4">{agentCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="missions" title="Active and completed missions">
            Missions
            {store.missions.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-[10px] px-1 py-0 h-4">{store.missions.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="runs" title="Execution history and run logs">Runs</TabsTrigger>
          <TabsTrigger value="logs" title="Real-time system event stream">Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="agents" className="mt-4">
          <AgentTable />
        </TabsContent>

        <TabsContent value="missions" className="mt-4">
          <MissionTable />
        </TabsContent>

        <TabsContent value="runs" className="mt-4">
          <RunsTable />
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          <LogsPanel />
        </TabsContent>
      </Tabs>

      {/* Overlays */}
      <AgentDetailSheet />
      <CreateMissionDialog open={missionDialogOpen} onClose={() => setMissionDialogOpen(false)} />
    </PageShell>
    </TooltipProvider>
  )
}
