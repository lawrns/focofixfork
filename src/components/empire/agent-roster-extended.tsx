'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Bot, Clock, AlertCircle, Zap, RefreshCw, Inbox, ClipboardList, Waypoints, ScrollText } from 'lucide-react'

interface SystemAgentEntry {
  id: string
  native_id: string
  backend: 'crico' | 'clawdbot' | 'bosun' | 'openclaw'
  name: string
  role: string
  model: 'OPUS' | 'SONNET' | 'KIMI' | 'GLM-5' | 'UNKNOWN'
  status: 'idle' | 'working' | 'blocked' | 'done' | 'error' | 'paused'
  last_active_at: string | null
  error_message: string | null
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
  size: string
  project_id: string | null
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
  created_at: string
  task_id: string | null
}

interface RecentActivity {
  id: string
  event_type: string
  title: string
  detail: string | null
  created_at: string
}

interface OverviewPayload {
  timestamp: string
  source_errors: string[]
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

const MODEL_COLORS: Record<string, string> = {
  OPUS:    'bg-purple-500/10 text-purple-600 border-purple-400/40',
  SONNET:  'bg-blue-500/10 text-blue-600 border-blue-400/40',
  KIMI:    'bg-[color:var(--foco-teal)]/10 text-[color:var(--foco-teal)] border-[color:var(--foco-teal)]/40',
  'GLM-5': 'bg-amber-500/10 text-amber-600 border-amber-400/40',
  UNKNOWN: 'bg-zinc-500/10 text-zinc-600 border-zinc-400/40',
}

const STATUS_COLORS: Record<string, string> = {
  idle: 'text-muted-foreground',
  working: 'text-[color:var(--foco-teal)]',
  blocked: 'text-amber-600',
  done: 'text-emerald-600',
  error: 'text-red-600',
  paused: 'text-blue-600',
}

interface AgentRosterExtendedProps {
  workspaceId?: string | null
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
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d ago`
}

export function AgentRosterExtended({ workspaceId }: AgentRosterExtendedProps) {
  const [overview, setOverview] = useState<OverviewPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadOverview = useCallback(async (options?: { silent?: boolean }) => {
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

  const sourceErrors = useMemo(() => overview?.source_errors ?? [], [overview])
  const systemAgents = useMemo(() => overview?.system_agents ?? [], [overview])
  const customAgents = useMemo(() => overview?.custom_agents ?? [], [overview])
  const laneStats = useMemo(() => overview?.lane_stats ?? [], [overview])
  const recent = useMemo(() => overview?.recent, [overview])
  const lastSyncLabel = useMemo(
    () => (overview?.timestamp ? formatRelativeTime(overview.timestamp) : 'never'),
    [overview?.timestamp]
  )

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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-muted-foreground">Last synced {lastSyncLabel}</p>
        <Button type="button" size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => void loadOverview()}>
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
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
            <p className="text-xs text-amber-700 font-medium">Partial data: some system sources are down.</p>
            <p className="text-xs text-muted-foreground mt-1">{sourceErrors.join(' | ')}</p>
          </CardContent>
        </Card>
      )}

      <Card>
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

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Live System Agents</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {systemAgents.length === 0 && (
            <p className="text-sm text-muted-foreground">No system agents are currently visible.</p>
          )}
          {systemAgents.map((agent) => (
            <SystemAgentCard key={agent.id} agent={agent} />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Custom Lane Agents</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {customAgents.length === 0 && (
            <p className="text-sm text-muted-foreground">No custom agents defined yet. Use the Custom Agent button to create one.</p>
          )}
          {customAgents.map((agent) => (
            <CustomAgentCard key={agent.id} agent={agent} />
          ))}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Recent Tasks
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(recent?.tasks ?? []).slice(0, 8).map((task) => (
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
            {(recent?.messages ?? []).filter((item) => item.status === 'open').slice(0, 8).map((message) => (
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
            {(recent?.decisions ?? []).slice(0, 8).map((decision) => (
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
            {(recent?.activity ?? []).slice(0, 8).map((event) => (
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
    </div>
  )
}

function SystemAgentCard({ agent }: { agent: SystemAgentEntry }) {
  const modelStyle = MODEL_COLORS[agent.model] ?? ''
  const statusStyle = STATUS_COLORS[agent.status] ?? STATUS_COLORS.idle

  const StatusIcon =
    agent.status === 'working' ? Zap :
    agent.status === 'error' ? AlertCircle :
    Clock

  return (
    <Link href={`/empire/command?agent=${encodeURIComponent(agent.id)}`} className="rounded-md border bg-card px-3 py-2.5 flex items-start gap-3 hover:bg-secondary/40 transition-colors">
      <div className="flex-shrink-0 mt-0.5">
        <div className={cn(
          'h-7 w-7 rounded-md flex items-center justify-center',
          agent.status === 'working' ? 'bg-[color:var(--foco-teal)]/10' : 'bg-secondary',
        )}>
          <Bot className={cn(
            'h-3.5 w-3.5',
            agent.status === 'working' ? 'text-[color:var(--foco-teal)]' : 'text-muted-foreground',
          )} />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13px] font-medium">{agent.name}</span>
          <Badge variant="outline" className={cn('text-[10px] font-mono-display border', modelStyle)}>
            {agent.model}
          </Badge>
          <Badge variant="outline" className="text-[10px] font-mono-display">
            {agent.backend}
          </Badge>
        </div>
        <p className="text-[11px] text-muted-foreground truncate">{agent.role}</p>
        <div className="flex items-center gap-2 mt-1">
          <StatusIcon className={cn('h-3 w-3', statusStyle)} />
          <span className={cn('text-[10px] font-mono-display uppercase', statusStyle)}>
            {agent.status}
          </span>
          {agent.last_active_at && (
            <span className="text-[10px] text-muted-foreground">
              · {formatRelativeTime(agent.last_active_at)}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}

function CustomAgentCard({ agent }: { agent: CustomAgentEntry }) {
  return (
    <div className="rounded-md border bg-card px-3 py-2.5 flex items-start gap-3">
      <Avatar className="h-8 w-8 mt-0.5">
        <AvatarImage src={agent.avatar_url ?? ''} alt={agent.name} />
        <AvatarFallback>{agent.name.slice(0, 2).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13px] font-medium">{agent.name}</span>
          <Badge variant="outline" className="text-[10px]">{LANE_LABEL[agent.lane]}</Badge>
          <Badge variant={agent.active ? 'secondary' : 'outline'} className="text-[10px]">
            {agent.active ? 'active' : 'inactive'}
          </Badge>
          <Badge variant="outline" className="text-[10px]">{agent.approval_sensitivity}</Badge>
        </div>
        <p className="text-[11px] text-muted-foreground line-clamp-1">
          {agent.description || `slug: ${agent.slug}`}
        </p>
        <p className="text-[10px] text-muted-foreground mt-1">
          Updated {formatRelativeTime(agent.updated_at)}
        </p>
      </div>
    </div>
  )
}
