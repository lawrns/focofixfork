'use client'

import { useState, useEffect, useCallback } from 'react'
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
import { RefreshCw, Plus, Cpu, AlertCircle, Pause, Play, Settings } from 'lucide-react'
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
  const [missionDialogOpen, setMissionDialogOpen] = useState(false)
  const [services, setServices] = useState<ServiceStatus[]>([])
  const [healthLoading, setHealthLoading] = useState(true)
  const [globalSearch, setGlobalSearch] = useState('')

  // ── Agent polling ────────────────────────────────────────────────────────────
  const { setAgents, setMissions, setError, setDecisions, approveDecision } = store
  const fetchAgents = useCallback(async () => {
    try {
      const [agentRes, missionRes] = await Promise.allSettled([
        fetch('/api/command-center/agents'),
        fetch('/api/command-center/missions'),
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
    } catch {
      setError('Failed to fetch agent data')
    }
  }, [setAgents, setMissions, setError])

  // ── Decisions polling ─────────────────────────────────────────────────────────
  const fetchDecisions = useCallback(async () => {
    try {
      const res = await fetch('/api/command-center/decisions')
      if (res.ok) {
        const json = await res.json()
        setDecisions(json.decisions ?? [])
      }
    } catch {
      // ignore
    }
  }, [setDecisions])

  useEffect(() => {
    fetchAgents()
    const id = setInterval(fetchAgents, AGENT_POLL_INTERVAL)
    return () => clearInterval(id)
  }, [fetchAgents])

  useEffect(() => {
    fetchDecisions()
    const id = setInterval(fetchDecisions, DECISIONS_POLL_INTERVAL)
    return () => clearInterval(id)
  }, [fetchDecisions])

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

  // ── Filtering ────────────────────────────────────────────────────────────────
  const filteredAgents = globalSearch
    ? store.agents.filter(a => a.name.toLowerCase().includes(globalSearch.toLowerCase()))
    : store.agents

  const filteredDecisions = globalSearch
    ? store.decisions.filter(d => d.title.toLowerCase().includes(globalSearch.toLowerCase()))
    : store.decisions

  const MODE_TIPS: Record<string, string> = {
    Reactive: 'Fast response, minimal guardrails',
    Predictive: 'Balanced safety and performance',
    Guarded: 'Maximum safety, all actions need approval',
  }

  return (
    <TooltipProvider delayDuration={200}>
    <PageShell>
      <PageHeader
        title="Agent Command Center"
        subtitle="Unified control surface for all agent backends"
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
                onClick={fetchAgents}
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
                onClick={() => store.setMode(mode)}
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
            <DropdownMenuItem onClick={fetchAgents}>
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
        <Tip label="All registered agents across backends">
          <div className="rounded-lg border bg-card p-3 space-y-1">
            <div className="text-[10px] text-muted-foreground font-mono">Total agents</div>
            <div className="text-2xl font-bold">{agentCount}</div>
          </div>
        </Tip>
      </div>

      {/* NEW: Main 2-col grid (System Pulse + Decisions) */}
      <div className="grid lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7 space-y-4">
          <SystemPulseChart />
          <QuickActionsCard />
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
