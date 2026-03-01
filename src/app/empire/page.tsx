'use client'

import { useState, useEffect, useCallback } from 'react'
import { PageShell } from '@/components/layout/page-shell'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmpireHealthGrid } from '@/components/empire/empire-health-grid'
import { BriefingCard } from '@/components/empire/briefing-card'
import { WorkflowList } from '@/components/empire/workflow-list'
import { AgentRosterExtended } from '@/components/empire/agent-roster-extended'
import {
  RefreshCw,
  Play,
  Activity,
  Bot,
  FileText,
  Server,
  ChevronDown,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ServiceStatus {
  name: string
  status: 'up' | 'down' | 'degraded'
  latencyMs?: number
  detail?: string
  url: string
}

interface HealthData {
  overall: 'up' | 'down' | 'degraded'
  timestamp: string
  services: ServiceStatus[]
}

interface WorkflowRun {
  workflowId: string
  runId: string
  type: string
  status: string
  startTime: string | null
  closeTime: string | null
}

// ── Workflow types available to trigger ───────────────────────────────────────

const WORKFLOW_TRIGGERS = [
  { label: 'Morning Briefing',     type: 'MorningBriefingWorkflow' },
  { label: 'Intel Pipeline',       type: 'IntelProcessingWorkflow' },
  { label: 'Auto-Ship',            type: 'AutoShipWorkflow' },
  { label: 'Weekly Meta Review',   type: 'WeeklyMetaWorkflow' },
  { label: 'Monthly Sovereign',    type: 'MonthlySovereignWorkflow' },
]

// ── Page ──────────────────────────────────────────────────────────────────────

export default function EmpirePage() {
  const [health, setHealth]               = useState<HealthData | null>(null)
  const [healthLoading, setHealthLoading] = useState(true)
  const [briefing, setBriefing]           = useState<unknown>(null)
  const [briefingLoading, setBriefingLoading] = useState(true)
  const [briefingError, setBriefingError] = useState<string | null>(null)
  const [workflows, setWorkflows]         = useState<WorkflowRun[]>([])
  const [wfLoading, setWfLoading]         = useState(true)
  const [wfError, setWfError]             = useState<string | null>(null)
  const [triggering, setTriggering]       = useState(false)
  const [lastRefresh, setLastRefresh]     = useState<Date | null>(null)

  const fetchHealth = useCallback(async () => {
    setHealthLoading(true)
    try {
      const res = await fetch('/api/empire/health')
      const data = await res.json() as HealthData
      setHealth(data)
    } catch {
      setHealth(null)
    } finally {
      setHealthLoading(false)
    }
  }, [])

  const fetchBriefing = useCallback(async () => {
    setBriefingLoading(true)
    setBriefingError(null)
    try {
      const res = await fetch('/api/empire/briefing')
      const data = await res.json()
      if (res.ok) {
        setBriefing(data)
      } else {
        setBriefingError(data?.error ?? 'Briefing unavailable')
        setBriefing(data) // may contain stub
      }
    } catch {
      setBriefingError('Briefing service unreachable')
    } finally {
      setBriefingLoading(false)
    }
  }, [])

  const fetchWorkflows = useCallback(async () => {
    setWfLoading(true)
    setWfError(null)
    try {
      const res = await fetch('/api/empire/workflows')
      const data = await res.json() as { workflows?: WorkflowRun[]; error?: string }
      setWorkflows(data.workflows ?? [])
      if (data.error) setWfError(data.error)
    } catch {
      setWfError('Temporal unreachable')
    } finally {
      setWfLoading(false)
    }
  }, [])

  const refresh = useCallback(() => {
    fetchHealth()
    fetchBriefing()
    fetchWorkflows()
    setLastRefresh(new Date())
  }, [fetchHealth, fetchBriefing, fetchWorkflows])

  useEffect(() => {
    refresh()
    const interval = setInterval(fetchHealth, 30_000) // re-probe health every 30s
    return () => clearInterval(interval)
  }, [refresh, fetchHealth])

  const triggerWorkflow = async (type: string) => {
    setTriggering(true)
    try {
      const res = await fetch('/api/empire/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflowType: type }),
      })
      await res.json()
      // Refresh workflow list after short delay
      setTimeout(fetchWorkflows, 1500)
    } finally {
      setTriggering(false)
    }
  }

  const overallStatus = health?.overall ?? 'down'
  const overallColor = overallStatus === 'up' ? 'text-emerald-500' : overallStatus === 'degraded' ? 'text-amber-500' : 'text-rose-500'

  return (
    <PageShell>
      <PageHeader
        title="Empire"
        description="ClawdBot Empire OS — infrastructure, briefings, and agent orchestration"
        actions={
          <div className="flex items-center gap-2">
            {lastRefresh && (
              <span className="text-[11px] text-muted-foreground hidden sm:block">
                Updated {lastRefresh.toLocaleTimeString()}
              </span>
            )}
            <Button variant="ghost" size="sm" onClick={refresh} disabled={healthLoading}>
              <RefreshCw className={cn('h-4 w-4 mr-1', healthLoading && 'animate-spin')} />
              Refresh
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" disabled={triggering}>
                  <Play className="h-4 w-4 mr-1" />
                  Trigger
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {WORKFLOW_TRIGGERS.map(wf => (
                  <DropdownMenuItem key={wf.type} onClick={() => triggerWorkflow(wf.type)}>
                    {wf.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      {/* Overall status banner */}
      <div className="flex items-center gap-2 mb-5">
        <div className={cn('h-2 w-2 rounded-full', {
          'bg-emerald-500': overallStatus === 'up',
          'bg-amber-500':   overallStatus === 'degraded',
          'bg-rose-500':    overallStatus === 'down',
        })} />
        <span className={cn('text-[12px] font-mono-display', overallColor)}>
          EMPIRE {overallStatus.toUpperCase()}
        </span>
        {health?.timestamp && (
          <span className="text-[11px] text-muted-foreground">
            · probed {new Date(health.timestamp).toLocaleTimeString()}
          </span>
        )}
      </div>

      <div className="space-y-6">

        {/* Panel 1: System Health */}
        <section>
          <SectionLabel icon={Server} label="System Health" />
          <EmpireHealthGrid
            services={health?.services ?? []}
            loading={healthLoading}
          />
        </section>

        {/* Panel 2 + 3: Briefing & Workflows side by side on large screens */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Panel 2: Morning Briefing */}
          <section>
            <SectionLabel icon={FileText} label="Morning Briefing" />
            <BriefingCard
              data={briefing as never}
              loading={briefingLoading}
              error={briefingError}
            />
          </section>

          {/* Panel 3: Active Workflows */}
          <section>
            <SectionLabel icon={Activity} label="Active Workflows" />
            <Card>
              <CardContent className="pt-4">
                <WorkflowList
                  workflows={workflows}
                  loading={wfLoading}
                  error={wfError}
                />
              </CardContent>
            </Card>
          </section>
        </div>

        {/* Panel 4: Agent Roster */}
        <section>
          <SectionLabel icon={Bot} label="Agent Roster" />
          <AgentRosterExtended />
        </section>
      </div>
    </PageShell>
  )
}

function SectionLabel({
  icon: Icon,
  label,
}: {
  icon: React.ElementType
  label: string
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="text-[11px] font-mono-display text-muted-foreground uppercase tracking-widest">
        {label}
      </span>
    </div>
  )
}
