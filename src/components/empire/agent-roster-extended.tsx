'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { AlertCircle, Bot, Crown, Eye, FileText, Pencil, RefreshCw, SendHorizontal, Settings2, Sparkles, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/data-display/avatar'
import { AgentStatusBadge, type EmpireAgentStatus } from '@/components/empire/agent-status-badge'
import { AgentDetailSheet, type AgentDetailData } from '@/components/empire/agent-detail-sheet'
import { CustomAgentModal } from '@/components/agent-ops/custom-agent-modal'
import { AgentLogViewer } from '@/components/empire/agent-log-viewer'

type BackendKey = 'crico' | 'clawdbot' | 'bosun' | 'openclaw'

interface SystemAgentEntry {
  id: string
  native_id: string
  backend: BackendKey
  name: string
  role: string
  model: 'OPUS' | 'SONNET' | 'KIMI' | 'GLM-5' | 'UNKNOWN'
  status: 'idle' | 'working' | 'blocked' | 'done' | 'error' | 'paused'
  last_active_at: string | null
  error_message: string | null
  avatar_url?: string | null
}

interface AdvisorEntry {
  id: string
  native_id: string
  backend: 'advisor'
  name: string
  role: string
  model: 'OPUS' | 'SONNET' | 'KIMI' | 'GLM-5' | 'UNKNOWN'
  status: 'idle' | 'working' | 'blocked' | 'done' | 'error' | 'paused'
  avatar_url: string
  featured_order: number
}

interface BackendHealthRow {
  backend: BackendKey
  status: 'up' | 'down'
  agent_count: number
  error: string | null
  last_checked_at: string
}

interface CustomAgentEntry {
  id: string
  name: string
  slug: string
  lane: 'product_ui' | 'platform_api' | 'requirements'
  description: string | null
  avatar_url: string | null
  active: boolean
  approval_sensitivity: 'low' | 'medium' | 'high'
  persona_tags: string[]
  updated_at: string
}

interface RecentTask {
  id: string
  lane: 'product_ui' | 'platform_api' | 'requirements'
  title: string
  status: string
  updated_at: string
}

interface RecentMessage {
  id: string
  from_lane: 'product_ui' | 'platform_api' | 'requirements'
  to_lane: 'product_ui' | 'platform_api' | 'requirements'
  subject: string
  status: string
  updated_at: string
}

interface RecentDecision {
  id: string
  title: string
  decision: string
}

interface RecentActivity {
  id: string
  event_type: string
  title: string
  created_at: string
}

interface OverviewPayload {
  timestamp: string
  source_errors: string[]
  backend_health: BackendHealthRow[]
  system_agents: SystemAgentEntry[]
  advisors: AdvisorEntry[]
  custom_agents: CustomAgentEntry[]
  recent: {
    tasks: RecentTask[]
    messages: RecentMessage[]
    decisions: RecentDecision[]
    activity: RecentActivity[]
  }
  totals: {
    system_agents: number
    advisors: number
    custom_agents: number
    tasks: number
    messages: number
    decisions: number
    open_messages: number
    active_custom_agents: number
  }
}

interface AgentRosterExtendedProps {
  workspaceId?: string | null
  preview?: boolean
}

type FocusAgent = {
  id: string
  name: string
  role: string
  purpose: string
  avatarUrl?: string | null
  status: EmpireAgentStatus
  model?: string
  backend: string
  lastActivity?: string | null
  dispatchHref?: string
  readOnly: boolean
  customAgentId?: string
  detail: AgentDetailData
  logAgent: {
    id: string
    name: string
    backend: string
    nativeId?: string
  }
}

const BACKEND_LABEL: Record<BackendKey, string> = {
  clawdbot: 'ClawdBot',
  crico: 'CRICO',
  bosun: 'Bosun',
  openclaw: 'OpenClaw',
}

const BACKEND_PURPOSE: Record<BackendKey, string> = {
  clawdbot: 'Lead execution operator for high-context work and live routing.',
  crico: 'Operations coordination and structured decision support.',
  bosun: 'Scheduling, automation, and repeatable task orchestration.',
  openclaw: 'Gateway and relay coverage for general dispatch.',
}

const LANE_LABEL: Record<'product_ui' | 'platform_api' | 'requirements', string> = {
  product_ui: 'Product/UI',
  platform_api: 'Platform/API',
  requirements: 'Requirements',
}

function formatRelativeTime(value?: string | null): string {
  if (!value) return 'never'
  const timestamp = new Date(value).getTime()
  if (!Number.isFinite(timestamp)) return 'unknown'
  const diffMs = Date.now() - timestamp
  if (diffMs < 60_000) return 'just now'
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  return `${Math.floor(diffHours / 24)}d ago`
}

function mapStatus(status: SystemAgentEntry['status'] | AdvisorEntry['status'], backendDown = false): EmpireAgentStatus {
  if (backendDown) return 'UNREACHABLE'
  if (status === 'working') return 'WORKING'
  if (status === 'error' || status === 'blocked') return 'ERROR'
  if (status === 'paused') return 'PAUSED'
  return 'IDLE'
}

function scoreSystemAgent(agent: SystemAgentEntry): number {
  const key = `${agent.name} ${agent.native_id} ${agent.role}`.toLowerCase()
  let score = 0
  if (/main|conductor|scheduler|relay/.test(key)) score += 30
  if (agent.status === 'working') score += 10
  if (agent.backend === 'clawdbot') score += 8
  if (agent.backend === 'crico') score += 6
  if (agent.backend === 'bosun') score += 4
  if (agent.backend === 'openclaw') score += 2
  return score
}

function normalizeRole(role: string, fallback: string): string {
  return role?.trim() || fallback
}

function createDetailData(agent: FocusAgent): AgentDetailData {
  return agent.detail
}

function FocusAgentCard({
  agent,
  onView,
  onLogs,
  workspaceId,
  onSaved,
}: {
  agent: FocusAgent
  onView: (detail: AgentDetailData) => void
  onLogs: (agent: FocusAgent['logAgent']) => void
  workspaceId?: string | null
  onSaved: () => void
}) {
  return (
    <div className="rounded-xl border bg-card/80 p-4">
      <div className="flex items-start gap-3">
        <Avatar className="h-12 w-12 flex-shrink-0">
          {agent.avatarUrl ? <AvatarImage src={agent.avatarUrl} alt={agent.name} /> : null}
          <AvatarFallback>{agent.name.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold">{agent.name}</h3>
            <AgentStatusBadge status={agent.status} backend={agent.backend} lastActivity={agent.lastActivity} />
            {agent.model ? <Badge variant="outline" className="text-[10px]">{agent.model}</Badge> : null}
          </div>
          <p className="mt-1 text-xs font-medium text-foreground/80">{agent.role}</p>
          <p className="mt-1 text-xs text-muted-foreground">{agent.purpose}</p>
          <p className="mt-2 text-[11px] text-muted-foreground">Last activity: {formatRelativeTime(agent.lastActivity)}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {agent.dispatchHref ? (
          <Button asChild size="sm" className="h-8 gap-1.5">
            <Link href={agent.dispatchHref}>
              <SendHorizontal className="h-3.5 w-3.5" />
              Dispatch
            </Link>
          </Button>
        ) : (
          <Button size="sm" className="h-8 gap-1.5" disabled>
            <SendHorizontal className="h-3.5 w-3.5" />
            Unavailable
          </Button>
        )}
        <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => onLogs(agent.logAgent)}>
          <FileText className="h-3.5 w-3.5" />
          Logs
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-8 gap-1.5" onClick={() => onView(createDetailData(agent))}>
          <Eye className="h-3.5 w-3.5" />
          Details
        </Button>
        {agent.customAgentId ? (
          <CustomAgentModal
            workspaceId={workspaceId}
            agentId={agent.customAgentId}
            onSaved={onSaved}
            trigger={(
              <Button type="button" variant="ghost" size="sm" className="h-8 gap-1.5">
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Button>
            )}
          />
        ) : null}
      </div>
    </div>
  )
}

function SectionHeader({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-start gap-2">
        <div className="mt-0.5 text-[color:var(--foco-teal)]">{icon}</div>
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">{title}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      {action}
    </div>
  )
}

export function AgentRosterExtended({ workspaceId, preview = false }: AgentRosterExtendedProps) {
  const [overview, setOverview] = useState<OverviewPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedDetail, setSelectedDetail] = useState<AgentDetailData | null>(null)
  const [logViewerOpen, setLogViewerOpen] = useState(false)
  const [selectedLogAgent, setSelectedLogAgent] = useState<{ id: string; name: string; backend: string; nativeId?: string } | null>(null)
  const loadInFlightRef = useRef(false)

  const loadOverview = useCallback(async (options?: { silent?: boolean }) => {
    if (loadInFlightRef.current) return
    loadInFlightRef.current = true
    if (!options?.silent) setLoading(true)
    setError(null)
    try {
      const search = new URLSearchParams()
      if (workspaceId) search.set('workspace_id', workspaceId)
      const query = search.toString()
      const res = await fetch(`/api/empire/agents/overview${query ? `?${query}` : ''}`)
      const json = await res.json()
      if (!res.ok || !json?.ok) {
        const message = json?.error?.message ?? json?.error ?? 'Failed to load agent roster'
        throw new Error(typeof message === 'string' ? message : 'Failed to load agent roster')
      }
      setOverview(json.data as OverviewPayload)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load agent roster')
    } finally {
      loadInFlightRef.current = false
      if (!options?.silent) setLoading(false)
    }
  }, [workspaceId])

  useEffect(() => {
    void loadOverview()
  }, [loadOverview])

  useEffect(() => {
    const intervalId = setInterval(() => {
      void loadOverview({ silent: true })
    }, 15_000)
    return () => clearInterval(intervalId)
  }, [loadOverview])

  const backendHealth = useMemo(() => overview?.backend_health ?? [], [overview?.backend_health])
  const sourceErrors = useMemo(() => overview?.source_errors ?? [], [overview?.source_errors])
  const systemAgents = useMemo(() => overview?.system_agents ?? [], [overview?.system_agents])
  const advisors = useMemo(() => overview?.advisors ?? [], [overview?.advisors])
  const customAgents = useMemo(() => overview?.custom_agents ?? [], [overview?.custom_agents])
  const activeCustomAgents = customAgents.filter((agent) => agent.active)
  const lastSyncLabel = overview?.timestamp ? formatRelativeTime(overview.timestamp) : 'never'

  const backendDown = useMemo(
    () => new Set(backendHealth.filter((row) => row.status === 'down').map((row) => row.backend)),
    [backendHealth]
  )

  const coreOperators = useMemo<FocusAgent[]>(() => {
    const ranked = [...systemAgents]
      .sort((a, b) => scoreSystemAgent(b) - scoreSystemAgent(a))
      .slice(0, preview ? 3 : 4)

    return ranked.map((agent) => ({
      id: agent.id,
      name: agent.name,
      role: normalizeRole(agent.role, BACKEND_LABEL[agent.backend]),
      purpose: BACKEND_PURPOSE[agent.backend],
      avatarUrl: agent.avatar_url,
      status: mapStatus(agent.status, backendDown.has(agent.backend)),
      model: agent.model,
      backend: BACKEND_LABEL[agent.backend],
      lastActivity: agent.last_active_at,
      dispatchHref: `/empire/command?agent=${encodeURIComponent(agent.id)}`,
      readOnly: true,
      detail: {
        id: agent.id,
        name: agent.name,
        type: 'SYSTEM',
        backend: BACKEND_LABEL[agent.backend],
        role: agent.role,
        model: agent.model,
        status: agent.status,
        lastActivity: agent.last_active_at,
        description: agent.error_message || BACKEND_PURPOSE[agent.backend],
        commandHref: `/empire/command?agent=${encodeURIComponent(agent.id)}`,
      },
      logAgent: {
        id: agent.id,
        name: agent.name,
        backend: agent.backend,
        nativeId: agent.native_id,
      },
    }))
  }, [backendDown, preview, systemAgents])

  const advisorCards = useMemo<FocusAgent[]>(() => {
    return advisors
      .sort((a, b) => a.featured_order - b.featured_order)
      .slice(0, preview ? 3 : advisors.length)
      .map((advisor) => ({
        id: advisor.id,
        name: advisor.name,
        role: advisor.role,
        purpose: 'Executive perspective for growth, operations, and strategic decision quality.',
        avatarUrl: advisor.avatar_url,
        status: mapStatus(advisor.status),
        model: advisor.model,
        backend: 'Advisor',
        lastActivity: null,
        dispatchHref: `/empire/command?agent=${encodeURIComponent(advisor.id)}`,
        readOnly: true,
        detail: {
          id: advisor.id,
          name: advisor.name,
          type: 'SYSTEM',
          backend: 'Advisor',
          role: advisor.role,
          model: advisor.model,
          status: advisor.status,
          description: `${advisor.name} is configured as a named executive advisor.`,
          commandHref: `/empire/command?agent=${encodeURIComponent(advisor.id)}`,
        },
        logAgent: {
          id: advisor.id,
          name: advisor.name,
          backend: advisor.backend,
          nativeId: advisor.native_id,
        },
      }))
  }, [advisors, preview])

  const customCards = useMemo<FocusAgent[]>(() => {
    return activeCustomAgents
      .slice(0, preview ? 2 : activeCustomAgents.length)
      .map((agent) => ({
        id: agent.id,
        name: agent.name,
        role: `${LANE_LABEL[agent.lane]} custom agent`,
        purpose: agent.description || `Focused on ${LANE_LABEL[agent.lane]} execution with ${agent.approval_sensitivity} approval sensitivity.`,
        avatarUrl: agent.avatar_url,
        status: agent.active ? 'IDLE' : 'PAUSED',
        backend: 'Custom',
        lastActivity: agent.updated_at,
        dispatchHref: `/empire/command?agent=${encodeURIComponent(agent.id)}`,
        readOnly: false,
        customAgentId: agent.id,
        detail: {
          id: agent.id,
          name: agent.name,
          type: 'CUSTOM',
          backend: 'custom-profile',
          lane: LANE_LABEL[agent.lane],
          status: agent.active ? 'active' : 'inactive',
          description: agent.description,
          personaTags: agent.persona_tags,
          commandHref: `/empire/command?agent=${encodeURIComponent(agent.id)}`,
        },
        logAgent: {
          id: agent.id,
          name: agent.name,
          backend: 'custom-profile',
        },
      }))
  }, [activeCustomAgents, preview])

  const technicalInventory = useMemo(() => {
    const coreIds = new Set(coreOperators.map((agent) => agent.id))
    return systemAgents.filter((agent) => !coreIds.has(agent.id))
  }, [coreOperators, systemAgents])

  const openMessages = (overview?.recent.messages ?? []).filter((item) => item.status === 'open')

  if (!overview && loading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 pt-6 text-sm text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Loading focused agent roster...
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className="space-y-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Focused roster</p>
            <h2 className="mt-1 text-xl font-semibold">Small team, clear jobs, obvious actions.</h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              This roster is intentionally curated. Core operators handle execution, executive advisors provide perspective, and active custom agents appear only when they are usable.
            </p>
            <p className="mt-2 text-[11px] text-muted-foreground">Last synced {lastSyncLabel}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <CustomAgentModal workspaceId={workspaceId} onSaved={() => void loadOverview({ silent: true })} />
            <Button type="button" variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => void loadOverview()}>
              <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
              Refresh
            </Button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <Card>
            <CardContent className="pt-4">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Core operators</p>
              <p className="mt-1 text-2xl font-semibold">{coreOperators.length}</p>
              <p className="mt-1 text-xs text-muted-foreground">Only the few system agents you should actually dispatch.</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Executive advisors</p>
              <p className="mt-1 text-2xl font-semibold">{advisorCards.length}</p>
              <p className="mt-1 text-xs text-muted-foreground">{overview?.totals.advisors ?? 0} available with portraits and direct dispatch.</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Active custom agents</p>
              <p className="mt-1 text-2xl font-semibold">{activeCustomAgents.length}</p>
              <p className="mt-1 text-xs text-muted-foreground">{customAgents.length - activeCustomAgents.length} paused or inactive profiles are hidden from the default roster.</p>
            </CardContent>
          </Card>
        </div>

        {error ? (
          <Card className="border-rose-500/40">
            <CardContent className="pt-4 text-sm text-rose-600">{error}</CardContent>
          </Card>
        ) : null}

        {sourceErrors.length > 0 ? (
          <Card className="border-amber-500/40 bg-amber-500/5">
            <CardContent className="flex items-start gap-2 pt-4">
              <AlertCircle className="mt-0.5 h-4 w-4 text-amber-600" />
              <div>
                <p className="text-sm font-medium text-amber-700">Some providers are degraded.</p>
                <p className="mt-1 text-xs text-muted-foreground">{sourceErrors.join(' | ')}</p>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardContent className="space-y-4 pt-5">
            <SectionHeader
              icon={<Bot className="h-4 w-4" />}
              title="Core Operators"
              description="Use these for day-to-day execution. Everything else technical is hidden below."
            />
            <div className="grid gap-3 xl:grid-cols-2">
              {coreOperators.map((agent) => (
                <FocusAgentCard
                  key={agent.id}
                  agent={agent}
                  onView={(detail) => {
                    setSelectedDetail(detail)
                    setDetailOpen(true)
                  }}
                  onLogs={(logAgent) => {
                    setSelectedLogAgent(logAgent)
                    setLogViewerOpen(true)
                  }}
                  workspaceId={workspaceId}
                  onSaved={() => void loadOverview({ silent: true })}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 pt-5">
            <SectionHeader
              icon={<Crown className="h-4 w-4" />}
              title="Executive Advisors"
              description="Named strategic advisors with portraits and direct dispatch access."
            />
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {advisorCards.map((agent) => (
                <FocusAgentCard
                  key={agent.id}
                  agent={agent}
                  onView={(detail) => {
                    setSelectedDetail(detail)
                    setDetailOpen(true)
                  }}
                  onLogs={(logAgent) => {
                    setSelectedLogAgent(logAgent)
                    setLogViewerOpen(true)
                  }}
                  workspaceId={workspaceId}
                  onSaved={() => void loadOverview({ silent: true })}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 pt-5">
            <SectionHeader
              icon={<Users className="h-4 w-4" />}
              title="Active Custom Agents"
              description="Only active custom agents are shown by default so the page stays clean."
              action={customAgents.length > activeCustomAgents.length ? <Badge variant="outline">{customAgents.length - activeCustomAgents.length} hidden</Badge> : undefined}
            />
            {customCards.length > 0 ? (
              <div className="grid gap-3 xl:grid-cols-2">
                {customCards.map((agent) => (
                  <FocusAgentCard
                    key={agent.id}
                    agent={agent}
                    onView={(detail) => {
                      setSelectedDetail(detail)
                      setDetailOpen(true)
                    }}
                    onLogs={(logAgent) => {
                      setSelectedLogAgent(logAgent)
                      setLogViewerOpen(true)
                    }}
                    workspaceId={workspaceId}
                    onSaved={() => void loadOverview({ silent: true })}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
                No active custom agents. Add one if you need a specialized operator for Product/UI, Platform/API, or Requirements.
              </div>
            )}
          </CardContent>
        </Card>

        {!preview ? (
          <details className="group rounded-xl border bg-card">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
              <div>
                <div className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-semibold uppercase tracking-wide">Technical Inventory</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Backend health, remaining system agents, and recent ops noise live here instead of cluttering the main roster.
                </p>
              </div>
              <Badge variant="outline">{technicalInventory.length} hidden agents</Badge>
            </summary>
            <div className="space-y-4 border-t px-4 py-4">
              <div className="grid gap-3 lg:grid-cols-2">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Backend Health</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {backendHealth.map((row) => (
                      <div key={row.backend} className="flex items-center justify-between rounded-md border px-3 py-2">
                        <div>
                          <p className="text-sm font-medium">{BACKEND_LABEL[row.backend]}</p>
                          <p className="text-xs text-muted-foreground">{row.error ?? `${row.agent_count} agents discovered`}</p>
                        </div>
                        <Badge variant="outline" className={cn(row.status === 'up' ? 'text-emerald-600' : 'text-rose-600')}>
                          {row.status}
                        </Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Recent Ops Signals</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {(overview?.recent.activity ?? []).slice(0, 5).map((event) => (
                      <div key={event.id} className="rounded-md border px-3 py-2">
                        <p className="text-sm font-medium">{event.title}</p>
                        <p className="text-xs text-muted-foreground">{event.event_type} · {formatRelativeTime(event.created_at)}</p>
                      </div>
                    ))}
                    {(overview?.recent.activity ?? []).length === 0 ? (
                      <p className="text-sm text-muted-foreground">No recent visibility events.</p>
                    ) : null}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Additional System Agents</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {technicalInventory.map((agent) => (
                    <div key={agent.id} className="flex flex-col gap-2 rounded-md border px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar size="xs">
                          {agent.avatar_url ? <AvatarImage src={agent.avatar_url} alt={agent.name} /> : null}
                          <AvatarFallback>{agent.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{agent.name}</p>
                          <p className="text-xs text-muted-foreground">{agent.role} · {BACKEND_LABEL[agent.backend]}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <AgentStatusBadge status={mapStatus(agent.status, backendDown.has(agent.backend))} backend={agent.backend} lastActivity={agent.last_active_at} />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8"
                          onClick={() => {
                            setSelectedDetail({
                              id: agent.id,
                              name: agent.name,
                              type: 'SYSTEM',
                              backend: BACKEND_LABEL[agent.backend],
                              role: agent.role,
                              model: agent.model,
                              status: agent.status,
                              lastActivity: agent.last_active_at,
                              description: agent.error_message || BACKEND_PURPOSE[agent.backend],
                              commandHref: `/empire/command?agent=${encodeURIComponent(agent.id)}`,
                            })
                            setDetailOpen(true)
                          }}
                        >
                          Details
                        </Button>
                      </div>
                    </div>
                  ))}
                  {technicalInventory.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No additional system agents hidden.</p>
                  ) : null}
                </CardContent>
              </Card>

              <div className="grid gap-3 lg:grid-cols-3">
                <Card>
                  <CardHeader className="pb-3"><CardTitle className="text-sm">Recent Tasks</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {(overview?.recent.tasks ?? []).slice(0, 4).map((task) => (
                      <div key={task.id} className="rounded-md border px-3 py-2">
                        <p className="text-sm font-medium">{task.title}</p>
                        <p className="text-xs text-muted-foreground">{LANE_LABEL[task.lane]} · {task.status}</p>
                      </div>
                    ))}
                    {(overview?.recent.tasks ?? []).length > 4 ? (
                      <Button asChild variant="ghost" size="sm" className="h-8">
                        <Link href="/tasks">More</Link>
                      </Button>
                    ) : null}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3"><CardTitle className="text-sm">Open Messages</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {openMessages.slice(0, 4).map((message) => (
                      <div key={message.id} className="rounded-md border px-3 py-2">
                        <p className="text-sm font-medium">{message.subject}</p>
                        <p className="text-xs text-muted-foreground">{LANE_LABEL[message.from_lane]} to {LANE_LABEL[message.to_lane]}</p>
                      </div>
                    ))}
                    {openMessages.length > 4 ? (
                      <Button asChild variant="ghost" size="sm" className="h-8">
                        <Link href="/empire/command">More</Link>
                      </Button>
                    ) : null}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3"><CardTitle className="text-sm">Recent Decisions</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {(overview?.recent.decisions ?? []).slice(0, 4).map((decision) => (
                      <div key={decision.id} className="rounded-md border px-3 py-2">
                        <p className="text-sm font-medium">{decision.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{decision.decision}</p>
                      </div>
                    ))}
                    {(overview?.recent.decisions ?? []).length > 4 ? (
                      <Button asChild variant="ghost" size="sm" className="h-8">
                        <Link href="/empire/command">More</Link>
                      </Button>
                    ) : null}
                  </CardContent>
                </Card>
              </div>
            </div>
          </details>
        ) : null}
      </div>

      <AgentLogViewer open={logViewerOpen} onOpenChange={setLogViewerOpen} agent={selectedLogAgent} />

      <AgentDetailSheet open={detailOpen} onOpenChange={setDetailOpen} data={selectedDetail} onEdit={undefined} />
    </>
  )
}
