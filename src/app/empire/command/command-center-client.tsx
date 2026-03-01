'use client'

import { useState, useEffect, useCallback } from 'react'
import { PageShell } from '@/components/layout/page-shell'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EmpireHealthGrid } from '@/components/empire/empire-health-grid'
import { DiagramContainer } from '@/components/command-center/diagram/diagram-container'
import { AgentDetailSheet } from '@/components/command-center/panels/agent-detail-sheet'
import { CreateMissionDialog } from '@/components/command-center/dialogs/create-mission-dialog'
import { AgentTable } from '@/components/command-center/tables/agent-table'
import { MissionTable } from '@/components/command-center/tables/mission-table'
import { RunsTable } from '@/components/command-center/tables/runs-table'
import { LogsPanel } from '@/components/command-center/tables/logs-panel'
import { MobileCommandView } from '@/components/command-center/mobile/mobile-command-view'
import { useCommandCenterStore } from '@/lib/stores/command-center-store'
import { RefreshCw, Plus, Cpu, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ServiceStatus {
  name: string
  status: 'up' | 'down' | 'degraded'
  latencyMs?: number
  detail?: string
  url: string
}

const POLL_INTERVAL = 10_000

export function CommandCenterClient() {
  const store = useCommandCenterStore()
  const [missionDialogOpen, setMissionDialogOpen] = useState(false)
  const [services, setServices] = useState<ServiceStatus[]>([])
  const [healthLoading, setHealthLoading] = useState(true)

  // ── Agent polling ────────────────────────────────────────────────────────────
  const { setAgents, setMissions, setError } = store
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

  useEffect(() => {
    fetchAgents()
    const id = setInterval(fetchAgents, POLL_INTERVAL)
    return () => clearInterval(id)
  }, [fetchAgents])

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

  const agentCount   = store.agents.length
  const workingCount = store.agents.filter(a => a.status === 'working').length

  return (
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
            <Button
              size="sm"
              onClick={() => setMissionDialogOpen(true)}
              className="gap-1.5 bg-[color:var(--foco-teal)] hover:bg-[color:var(--foco-teal)]/90"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Mission</span>
            </Button>
          </div>
        }
      />

      {/* Health tiles */}
      <EmpireHealthGrid services={services} loading={healthLoading} />

      {/* SwarmFlowDiagram — hidden on mobile, replaced by MobileCommandView */}
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

      {/* Tabs */}
      <Tabs defaultValue="agents">
        <TabsList>
          <TabsTrigger value="agents">
            Agents
            {agentCount > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-[10px] px-1 py-0 h-4">{agentCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="missions">
            Missions
            {store.missions.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-[10px] px-1 py-0 h-4">{store.missions.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="runs">Runs</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
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
  )
}
