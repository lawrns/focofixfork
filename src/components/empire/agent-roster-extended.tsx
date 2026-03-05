'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  AlertCircle,
  ClipboardList,
  FileText,
  Inbox,
  RefreshCw,
  ScrollText,
  Waypoints,
  Eye,
  SendHorizontal,
  Pencil,
  CheckCircle2,
  XCircle,
  RotateCcw,
} from 'lucide-react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/data-display/avatar'
import { getAgentAvatar } from '@/lib/agent-avatars'
import { AgentStatusBadge, type EmpireAgentStatus } from '@/components/empire/agent-status-badge'
import { AgentDetailSheet, type AgentDetailData } from '@/components/empire/agent-detail-sheet'
import { CustomAgentModal } from '@/components/agent-ops/custom-agent-modal'
import { AgentLogViewer } from '@/components/empire/agent-log-viewer'

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
}

type BackendKey = 'crico' | 'clawdbot' | 'bosun' | 'openclaw'

interface BackendHealthRow {
  backend: BackendKey
  status: 'up' | 'down'
  agent_count: number
  error: string | null
  last_checked_at: string
}

interface BackendRetryState {
  failures: number
  retrying: boolean
  nextRetryAt: number | null
  lastSuccessfulSync: string | null
  lastError: string | null
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

interface LaneStat {
  lane: 'product_ui' | 'platform_api' | 'requirements'
  custom_agents: number
  active_custom_agents: number
  open_messages_in: number
  open_messages_out: number
  task_counts: Record<string, number>
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
  custom_agents: CustomAgentEntry[]
  lane_stats: LaneStat[]
  recent: {
    tasks: RecentTask[]
    messages: RecentMessage[]
    decisions: RecentDecision[]
    activity: RecentActivity[]
  }
  totals: {
    system_agents: number
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

type RosterAgentRow = {
  id: string
  agentId: string
  nativeId?: string
  name: string
  type: 'SYSTEM' | 'CUSTOM' | 'ADAPTER'
  backend: string
  status: EmpireAgentStatus
  role?: string
  lane?: string
  model?: string
  lastActivity?: string | null
  readOnly: boolean
  dispatchHref?: string
  detail: AgentDetailData
  customAgentId?: string
}

const LANE_LABEL: Record<'product_ui' | 'platform_api' | 'requirements', string> = {
  product_ui: 'Product/UI',
  platform_api: 'Platform/API',
  requirements: 'Requirements',
}

const BACKEND_ORDER: BackendKey[] = ['clawdbot', 'crico', 'bosun', 'openclaw']

const BACKEND_LABEL: Record<BackendKey, string> = {
  clawdbot: 'ClawdBot',
  crico: 'CRICO',
  bosun: 'Bosun',
  openclaw: 'OpenClaw',
}

function defaultBackendRetryState(): Record<BackendKey, BackendRetryState> {
  return {
    clawdbot: { failures: 0, retrying: false, nextRetryAt: null, lastSuccessfulSync: null, lastError: null },
    crico: { failures: 0, retrying: false, nextRetryAt: null, lastSuccessfulSync: null, lastError: null },
    bosun: { failures: 0, retrying: false, nextRetryAt: null, lastSuccessfulSync: null, lastError: null },
    openclaw: { failures: 0, retrying: false, nextRetryAt: null, lastSuccessfulSync: null, lastError: null },
  }
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
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d ago`
}

function mapSystemStatus(status: SystemAgentEntry['status']): EmpireAgentStatus {
  if (status === 'working') return 'WORKING'
  if (status === 'error') return 'ERROR'
  if (status === 'paused') return 'PAUSED'
  return 'IDLE'
}

function parseErrorBackend(sourceError: string): BackendKey | null {
  const lower = sourceError.toLowerCase()
  if (lower.startsWith('clawdbot:')) return 'clawdbot'
  if (lower.startsWith('crico:')) return 'crico'
  if (lower.startsWith('bosun:')) return 'bosun'
  if (lower.startsWith('openclaw:')) return 'openclaw'
  return null
}

function formatSeconds(ms: number): string {
  return `${Math.max(1, Math.ceil(ms / 1000))}s`
}

export function AgentRosterExtended({ workspaceId, preview = false }: AgentRosterExtendedProps) {
  const [overview, setOverview] = useState<OverviewPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedDetail, setSelectedDetail] = useState<AgentDetailData | null>(null)
  const [logViewerOpen, setLogViewerOpen] = useState(false)
  const [selectedLogAgent, setSelectedLogAgent] = useState<{
    id: string
    name: string
    backend: string
    nativeId?: string
  } | null>(null)
  const [backendRetries, setBackendRetries] = useState<Record<BackendKey, BackendRetryState>>(
    defaultBackendRetryState
  )
  const [retryNow, setRetryNow] = useState(Date.now())
  const loadInFlightRef = useRef(false)

  const syncBackendRetries = useCallback((payload: OverviewPayload) => {
    const now = Date.now()
    setBackendRetries((prev) => {
      const next: Record<BackendKey, BackendRetryState> = { ...prev }
      const healthByBackend = new Map(payload.backend_health.map((row) => [row.backend, row] as const))

      BACKEND_ORDER.forEach((backend) => {
        const existing = next[backend]
        const row = healthByBackend.get(backend)
        if (row?.status === 'up') {
          next[backend] = {
            failures: 0,
            retrying: false,
            nextRetryAt: null,
            lastSuccessfulSync: row.last_checked_at,
            lastError: null,
          }
          return
        }

        const sourceError = payload.source_errors.find((item) => parseErrorBackend(item) === backend)
        const failures = Math.min((existing?.failures ?? 0) + 1, 4)
        const delayMs = Math.min(2 ** (failures - 1) * 1000, 8000)
        next[backend] = {
          failures,
          retrying: false,
          nextRetryAt: now + delayMs,
          lastSuccessfulSync: existing?.lastSuccessfulSync ?? null,
          lastError: row?.error ?? sourceError ?? existing?.lastError ?? 'Backend unavailable',
        }
      })

      return next
    })
  }, [])

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
      const payload = json.data as OverviewPayload
      setOverview(payload)
      syncBackendRetries(payload)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load agent roster')
    } finally {
      loadInFlightRef.current = false
      if (!options?.silent) setLoading(false)
    }
  }, [syncBackendRetries, workspaceId])

  const retryBackend = useCallback(async (backend: BackendKey) => {
    setBackendRetries((prev) => ({
      ...prev,
      [backend]: {
        ...prev[backend],
        retrying: true,
        nextRetryAt: null,
      },
    }))
    await loadOverview({ silent: true })
  }, [loadOverview])

  useEffect(() => {
    void loadOverview()
  }, [loadOverview])

  useEffect(() => {
    const intervalId = setInterval(() => {
      void loadOverview({ silent: true })
    }, 15_000)
    return () => clearInterval(intervalId)
  }, [loadOverview])

  useEffect(() => {
    const intervalId = setInterval(() => {
      setRetryNow(Date.now())
      const backendDue = BACKEND_ORDER.find((backend) => {
        const state = backendRetries[backend]
        return Boolean(state.nextRetryAt && state.nextRetryAt <= Date.now() && !state.retrying)
      })
      if (backendDue) void retryBackend(backendDue)
    }, 1000)
    return () => clearInterval(intervalId)
  }, [backendRetries, retryBackend])

  const sourceErrors = useMemo(() => overview?.source_errors ?? [], [overview])
  const backendHealth = useMemo(() => {
    const rows = overview?.backend_health ?? []
    const map = new Map(rows.map((row) => [row.backend, row] as const))
    return BACKEND_ORDER.map((backend) => map.get(backend) ?? ({
      backend,
      status: 'down',
      agent_count: 0,
      error: backendRetries[backend].lastError ?? 'No data',
      last_checked_at: overview?.timestamp ?? new Date().toISOString(),
    }))
  }, [backendRetries, overview?.backend_health, overview?.timestamp])
  const systemAgents = useMemo(() => overview?.system_agents ?? [], [overview])
  const customAgents = useMemo(() => overview?.custom_agents ?? [], [overview])
  const laneStats = useMemo(() => overview?.lane_stats ?? [], [overview])
  const recent = useMemo(() => overview?.recent, [overview])
  const lastSyncLabel = useMemo(
    () => (overview?.timestamp ? formatRelativeTime(overview.timestamp) : 'never'),
    [overview?.timestamp]
  )

  const rosterRows = useMemo<RosterAgentRow[]>(() => {
    const systemRows: RosterAgentRow[] = systemAgents.map((agent) => ({
      id: `system-${agent.id}`,
      agentId: agent.id,
      nativeId: agent.native_id,
      name: agent.name,
      type: 'SYSTEM',
      backend: agent.backend,
      status: mapSystemStatus(agent.status),
      role: agent.role,
      model: agent.model,
      lastActivity: agent.last_active_at,
      readOnly: true,
      dispatchHref: agent.status === 'working' ? undefined : `/empire/command?agent=${encodeURIComponent(agent.id)}`,
      detail: {
        id: agent.id,
        name: agent.name,
        type: 'SYSTEM',
        backend: agent.backend,
        role: agent.role,
        model: agent.model,
        status: agent.status,
        lastActivity: agent.last_active_at,
        description: agent.error_message || `${agent.role} (${agent.backend})`,
        commandHref: `/empire/command?agent=${encodeURIComponent(agent.id)}`,
      },
    }))

    const customRows: RosterAgentRow[] = customAgents.map((agent) => ({
      id: `custom-${agent.id}`,
      agentId: agent.id,
      name: agent.name,
      type: 'CUSTOM',
      backend: 'custom-profile',
      status: agent.active ? 'IDLE' : 'PAUSED',
      lane: LANE_LABEL[agent.lane],
      lastActivity: agent.updated_at,
      readOnly: false,
      dispatchHref: agent.active ? `/empire/command?agent=${encodeURIComponent(agent.id)}` : undefined,
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
        commandHref: agent.active ? `/empire/command?agent=${encodeURIComponent(agent.id)}` : undefined,
      },
    }))

    const combined = [...systemRows, ...customRows]
    return preview ? combined.slice(0, 5) : combined
  }, [customAgents, preview, systemAgents])

  if (!overview && loading) {
    return (
      <Card>
        <CardContent className="pt-6 flex items-center gap-2 text-sm text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Loading agent roster...
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between animate-slide-up">
          <p className="text-[11px] text-muted-foreground">Last synced {lastSyncLabel}</p>
          <div className="flex items-center gap-2">
            {preview && (
              <Button asChild type="button" size="sm" variant="outline" className="h-8">
                <Link href="/empire/agents">Manage Agents</Link>
              </Button>
            )}
            <CustomAgentModal workspaceId={workspaceId} onSaved={() => void loadOverview({ silent: true })} />
            <Button type="button" size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => void loadOverview()}>
              <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
              Refresh
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 animate-slide-up-delay">
          <Card>
            <CardContent className="pt-4">
              <p className="text-[11px] font-mono-display text-muted-foreground uppercase tracking-widest">System Agents</p>
              <p className="text-xl font-semibold mt-1">{overview?.totals.system_agents ?? 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-[11px] font-mono-display text-muted-foreground uppercase tracking-widest">Custom Agents</p>
              <p className="text-xl font-semibold mt-1">{overview?.totals.custom_agents ?? 0}</p>
              <p className="text-[11px] text-muted-foreground mt-1">{overview?.totals.active_custom_agents ?? 0} active</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-[11px] font-mono-display text-muted-foreground uppercase tracking-widest">Task Queue</p>
              <p className="text-xl font-semibold mt-1">{overview?.totals.tasks ?? 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-[11px] font-mono-display text-muted-foreground uppercase tracking-widest">Open Messages</p>
              <p className="text-xl font-semibold mt-1">{overview?.totals.open_messages ?? 0}</p>
            </CardContent>
          </Card>
        </div>

        {error && (
          <Card className="border-red-500/40">
            <CardContent className="pt-4 text-sm text-red-600">{error}</CardContent>
          </Card>
        )}

        {sourceErrors.length > 0 && (
          <Card className="border-amber-500/40">
            <CardContent className="pt-4">
              <p className="text-xs text-amber-700 font-medium">Partial data: some agent backends are unavailable.</p>
              <p className="text-xs text-muted-foreground mt-1">{sourceErrors.join(' | ')}</p>
            </CardContent>
          </Card>
        )}

        <Card className="animate-slide-up-delay">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Backend Health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {backendHealth.map((row) => {
              const retry = backendRetries[row.backend]
              const nextRetryInMs = retry.nextRetryAt ? retry.nextRetryAt - retryNow : null
              const down = row.status === 'down'

              return (
                <div key={row.backend} className="rounded-md border p-2.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {down ? (
                        <XCircle className="h-4 w-4 text-red-500" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      )}
                      <p className="text-sm font-medium">{BACKEND_LABEL[row.backend]}</p>
                      <Badge variant="outline" className={cn('text-[10px]', down ? 'text-red-600 border-red-500/40' : 'text-emerald-600 border-emerald-500/40')}>
                        {down ? 'DOWN' : 'UP'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {down
                        ? (retry.lastError ?? row.error ?? 'Backend unavailable')
                        : `${row.agent_count} agents online`}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Last successful sync: {retry.lastSuccessfulSync ? formatRelativeTime(retry.lastSuccessfulSync) : 'never'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {down && nextRetryInMs && nextRetryInMs > 0 && (
                      <Badge variant="outline" className="text-[10px]">
                        Auto retry in {formatSeconds(nextRetryInMs)}
                      </Badge>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1.5"
                      onClick={() => void retryBackend(row.backend)}
                      disabled={retry.retrying}
                    >
                      <RotateCcw className={cn('h-3.5 w-3.5', retry.retrying && 'animate-spin')} />
                      Retry now
                    </Button>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        <Card className="animate-slide-up-delay">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Agent Management</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Agent</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Agent Type</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Backend</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Last Activity</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rosterRows.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-sm text-muted-foreground">No agents available.</td>
                    </tr>
                  )}

                  {rosterRows.map((agent) => (
                    <tr key={agent.id} className="border-b last:border-b-0">
                      <td className="px-3 py-2 align-top">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Avatar size="xs" className="flex-shrink-0">
                              <AvatarImage src={getAgentAvatar({ name: agent.name, nativeId: agent.nativeId, backend: agent.backend })} alt={agent.name} />
                              <AvatarFallback className="text-[9px]">{agent.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{agent.name}</span>
                            {agent.model && <Badge variant="outline" className="text-[10px]">{agent.model}</Badge>}
                            <AgentStatusBadge
                              status={agent.status}
                              backend={agent.backend}
                              lastActivity={agent.lastActivity}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {agent.role || agent.lane || 'No role description'}
                          </p>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant="outline" className="text-[10px]">{agent.type}</Badge>
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant="outline" className="text-[10px]">{agent.backend}</Badge>
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {agent.lastActivity ? formatRelativeTime(agent.lastActivity) : 'IDLE'}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => {
                              setSelectedDetail(agent.detail)
                              setDetailOpen(true)
                            }}
                            title="View details"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>

                          {agent.dispatchHref ? (
                            <Button size="icon" variant="ghost" className="h-7 w-7" asChild title="Dispatch task">
                              <Link href={agent.dispatchHref}>
                                <SendHorizontal className="h-3.5 w-3.5" />
                              </Link>
                            </Button>
                          ) : (
                            <Button size="icon" variant="ghost" className="h-7 w-7" disabled title="Busy or unavailable">
                              <SendHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          )}

                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            title="View execution logs"
                            onClick={() => {
                              setSelectedLogAgent({
                                id: agent.agentId,
                                name: agent.name,
                                backend: agent.backend,
                                nativeId: agent.nativeId,
                              })
                              setLogViewerOpen(true)
                            }}
                          >
                            <FileText className="h-3.5 w-3.5" />
                          </Button>

                          {agent.customAgentId ? (
                            <CustomAgentModal
                              workspaceId={workspaceId}
                              agentId={agent.customAgentId}
                              onSaved={() => void loadOverview({ silent: true })}
                              trigger={(
                                <Button size="icon" variant="ghost" className="h-7 w-7" title="Edit custom agent">
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            />
                          ) : (
                            <Badge variant="outline" className="text-[10px]">READ ONLY</Badge>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {!preview && (
          <>
            <Card className="animate-slide-up-delay">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Lane Operations</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {laneStats.map((lane) => (
                  <div key={lane.lane} className="rounded-md border p-3">
                    <p className="text-[12px] font-medium">{LANE_LABEL[lane.lane]}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {lane.active_custom_agents}/{lane.custom_agents} custom active
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {lane.task_counts.draft ?? 0} draft · {lane.task_counts.approved ?? 0} approved · {lane.task_counts.in_progress ?? 0} in progress
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {lane.open_messages_in} open inbound · {lane.open_messages_out} open outbound
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 animate-slide-up-delay-2">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <ClipboardList className="h-4 w-4" />
                    Recent Tasks
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {(recent?.tasks ?? []).slice(0, 6).map((task) => (
                    <div key={task.id} className="rounded-md border p-2">
                      <p className="text-[12px] font-medium line-clamp-1">{task.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {LANE_LABEL[task.lane]} · {task.status} · {formatRelativeTime(task.updated_at)}
                      </p>
                    </div>
                  ))}
                  {(recent?.tasks ?? []).length === 0 && <p className="text-sm text-muted-foreground">No task activity yet.</p>}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Inbox className="h-4 w-4" />
                    Open Messages
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {(recent?.messages ?? []).filter((item) => item.status === 'open').slice(0, 6).map((message) => (
                    <div key={message.id} className="rounded-md border p-2">
                      <p className="text-[12px] font-medium line-clamp-1">{message.subject}</p>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {LANE_LABEL[message.from_lane]} to {LANE_LABEL[message.to_lane]} · {formatRelativeTime(message.updated_at)}
                      </p>
                    </div>
                  ))}
                  {(recent?.messages ?? []).filter((item) => item.status === 'open').length === 0 && <p className="text-sm text-muted-foreground">No open messages.</p>}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Waypoints className="h-4 w-4" />
                    Recent Decisions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {(recent?.decisions ?? []).slice(0, 6).map((decision) => (
                    <div key={decision.id} className="rounded-md border p-2">
                      <p className="text-[12px] font-medium line-clamp-1">{decision.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">{decision.decision}</p>
                    </div>
                  ))}
                  {(recent?.decisions ?? []).length === 0 && <p className="text-sm text-muted-foreground">No decisions logged yet.</p>}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <ScrollText className="h-4 w-4" />
                    Visibility Feed
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {(recent?.activity ?? []).slice(0, 6).map((event) => (
                    <div key={event.id} className="rounded-md border p-2">
                      <p className="text-[12px] font-medium line-clamp-1">{event.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {event.event_type} · {formatRelativeTime(event.created_at)}
                      </p>
                    </div>
                  ))}
                  {(recent?.activity ?? []).length === 0 && <p className="text-sm text-muted-foreground">No tracked actions yet.</p>}
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {sourceErrors.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-amber-600">
            <AlertCircle className="h-3.5 w-3.5" />
            Some providers are degraded. Retry from Refresh or use manual dispatch in Command Center.
          </div>
        )}
      </div>

      <AgentLogViewer
        open={logViewerOpen}
        onOpenChange={setLogViewerOpen}
        agent={selectedLogAgent}
      />

      <AgentDetailSheet
        open={detailOpen}
        onOpenChange={setDetailOpen}
        data={selectedDetail}
        onEdit={undefined}
      />
    </>
  )
}
