import { NextRequest } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import {
  authRequiredResponse,
  databaseErrorResponse,
  successResponse,
  validationFailedResponse,
} from '@/lib/api/response-helpers'
import { verifyWorkspaceMembership } from '@/lib/cofounder-mode/config-resolver'
import { fetchCricoAgents } from '@/lib/command-center/adapters/crico-adapter'
import { fetchClawdbotAgents } from '@/lib/command-center/adapters/clawdbot-adapter'
import { fetchBosunAgents } from '@/lib/command-center/adapters/bosun-adapter'
import { fetchOpenClawAgents } from '@/lib/command-center/adapters/openclaw-adapter'
import type { UnifiedAgent } from '@/lib/command-center/types'
import { AGENT_LANES, type AgentLane, type CustomAgentProfileRow } from '@/lib/agent-ops/types'
import { getAgentAvatar, SPECIALIST_ADVISORS } from '@/lib/agent-avatars'

export const dynamic = 'force-dynamic'

interface TaskLite {
  id: string
  lane: AgentLane
  title: string
  status: string
  updated_at: string
  size: string
  project_id: string | null
}

interface MessageLite {
  id: string
  from_lane: AgentLane
  to_lane: AgentLane
  subject: string
  status: string
  updated_at: string
}

interface DecisionLite {
  id: string
  title: string
  decision: string
  created_at: string
  task_id: string | null
}

interface ActivityLite {
  id: string
  event_type: string
  title: string
  detail: string | null
  created_at: string
}

interface LaneStat {
  lane: AgentLane
  custom_agents: number
  active_custom_agents: number
  open_messages_in: number
  open_messages_out: number
  task_counts: Record<string, number>
}

type BackendKey = 'crico' | 'clawdbot' | 'bosun' | 'openclaw'

interface BackendHealthRow {
  backend: BackendKey
  status: 'up' | 'down'
  agent_count: number
  error: string | null
  last_checked_at: string
}

const BACKEND_KEYS: BackendKey[] = ['crico', 'clawdbot', 'bosun', 'openclaw']

function emptyTaskCounts(): Record<string, number> {
  return {
    draft: 0,
    approved: 0,
    in_progress: 0,
    blocked: 0,
    done: 0,
    archived: 0,
  }
}

function normalizeModel(model?: string): 'OPUS' | 'SONNET' | 'KIMI' | 'GLM-5' | 'UNKNOWN' {
  if (!model) return 'UNKNOWN'
  const value = model.toUpperCase()
  if (value.includes('OPUS')) return 'OPUS'
  if (value.includes('SONNET')) return 'SONNET'
  if (value.includes('GLM-5') || value.includes('GLM')) return 'GLM-5'
  if (value.includes('KIMI')) return 'KIMI'
  return 'UNKNOWN'
}

function mapSystemAgent(agent: UnifiedAgent) {
  return {
    id: agent.id,
    native_id: agent.nativeId,
    backend: agent.backend,
    name: agent.name,
    role: agent.role,
    status: agent.status,
    model: normalizeModel(agent.model),
    last_active_at: agent.lastActiveAt ?? null,
    error_message: agent.errorMessage ?? null,
    avatar_url: agent.avatarUrl || getAgentAvatar({ name: agent.name, nativeId: agent.nativeId, backend: agent.backend }),
  }
}

function parseBackends(raw: string | null): BackendKey[] {
  if (!raw) return [...BACKEND_KEYS]
  const parsed = raw
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter((value): value is BackendKey => BACKEND_KEYS.includes(value as BackendKey))
  if (parsed.length === 0) return [...BACKEND_KEYS]
  return [...new Set(parsed)]
}

export async function GET(req: NextRequest) {
  const { user, supabase, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  const url = new URL(req.url)
  const workspaceId = url.searchParams.get('workspace_id')
  const requestedBackends = parseBackends(url.searchParams.get('backends'))
  if (workspaceId) {
    const isMember = await verifyWorkspaceMembership(supabase, user.id, workspaceId)
    if (!isMember) {
      return mergeAuthResponse(validationFailedResponse('Workspace access denied'), authResponse)
    }
  }

  const baseUrl = 'http://127.0.0.1:3001'
  const openclawToken = process.env.OPENCLAW_SERVICE_TOKEN
  const bosunToken = process.env.BOSUN_SERVICE_TOKEN

  const backendFetchers: Array<{ backend: BackendKey; fetch: () => Promise<UnifiedAgent[]> }> = [
    { backend: 'crico', fetch: () => fetchCricoAgents(baseUrl, openclawToken) },
    { backend: 'clawdbot', fetch: () => fetchClawdbotAgents(baseUrl, openclawToken) },
    { backend: 'bosun', fetch: () => fetchBosunAgents(baseUrl, bosunToken) },
    { backend: 'openclaw', fetch: () => fetchOpenClawAgents(baseUrl) },
  ]

  const selectedFetchers = backendFetchers.filter((item) => requestedBackends.includes(item.backend))
  const agentResults = await Promise.allSettled(selectedFetchers.map((item) => item.fetch()))

  const checkedAt = new Date().toISOString()
  const sourceErrors: string[] = []
  const backendHealth: BackendHealthRow[] = []
  const allAgents: UnifiedAgent[] = []
  for (let i = 0; i < agentResults.length; i += 1) {
    const result = agentResults[i]
    const backend = selectedFetchers[i]?.backend ?? 'openclaw'
    if (result.status === 'fulfilled') {
      const agents = result.value ?? []
      allAgents.push(...agents)
      backendHealth.push({
        backend,
        status: 'up',
        agent_count: agents.length,
        error: null,
        last_checked_at: checkedAt,
      })
    } else {
      const reason = result.reason?.message ?? 'unknown error'
      sourceErrors.push(`${backend}: ${reason}`)
      backendHealth.push({
        backend,
        status: 'down',
        agent_count: 0,
        error: reason,
        last_checked_at: checkedAt,
      })
    }
  }

  const seen = new Set<string>()
  const systemAgents = allAgents
    .filter((agent) => {
      if (seen.has(agent.id)) return false
      seen.add(agent.id)
      return true
    })
    .map(mapSystemAgent)

  const advisors = SPECIALIST_ADVISORS.map((advisor, index) => ({
    id: advisor.id,
    native_id: advisor.nativeId,
    backend: advisor.backend,
    name: advisor.name,
    role: advisor.role,
    model: normalizeModel(advisor.model),
    status: advisor.status,
    avatar_url: advisor.avatarUrl,
    featured_order: index,
  }))

  let customQuery = supabase
    .from('custom_agent_profiles')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(100)

  let taskQuery = supabase
    .from('agent_ops_tasks')
    .select('id, lane, title, status, updated_at, size, project_id')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(120)

  let messageQuery = supabase
    .from('agent_ops_messages')
    .select('id, from_lane, to_lane, subject, status, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(120)

  let decisionQuery = supabase
    .from('agent_ops_decisions')
    .select('id, title, decision, created_at, task_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(80)

  let activityQuery = supabase
    .from('cofounder_decisions_history')
    .select('id, event_type, title, detail, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(80)

  if (workspaceId) {
    const scopeFilter = `workspace_id.eq.${workspaceId},workspace_id.is.null`
    customQuery = customQuery.or(scopeFilter)
    taskQuery = taskQuery.or(scopeFilter)
    messageQuery = messageQuery.or(scopeFilter)
    decisionQuery = decisionQuery.or(scopeFilter)
    activityQuery = activityQuery.or(scopeFilter)
  }

  const [
    { data: customAgents, error: customError },
    { data: tasks, error: taskError },
    { data: messages, error: messageError },
    { data: decisions, error: decisionError },
    { data: activity, error: activityError },
  ] = await Promise.all([
    customQuery.returns<CustomAgentProfileRow[]>(),
    taskQuery.returns<TaskLite[]>(),
    messageQuery.returns<MessageLite[]>(),
    decisionQuery.returns<DecisionLite[]>(),
    activityQuery.returns<ActivityLite[]>(),
  ])

  if (customError) return mergeAuthResponse(databaseErrorResponse('Failed to load custom agent profiles', customError.message), authResponse)
  if (taskError) return mergeAuthResponse(databaseErrorResponse('Failed to load agent ops tasks', taskError.message), authResponse)
  if (messageError) return mergeAuthResponse(databaseErrorResponse('Failed to load agent ops messages', messageError.message), authResponse)
  if (decisionError) return mergeAuthResponse(databaseErrorResponse('Failed to load agent ops decisions', decisionError.message), authResponse)
  if (activityError) return mergeAuthResponse(databaseErrorResponse('Failed to load action visibility activity', activityError.message), authResponse)

  const laneStats = Object.fromEntries(
    AGENT_LANES.map((lane) => [lane, {
      lane,
      custom_agents: 0,
      active_custom_agents: 0,
      open_messages_in: 0,
      open_messages_out: 0,
      task_counts: emptyTaskCounts(),
    } satisfies LaneStat])
  ) as Record<AgentLane, LaneStat>

  for (const row of customAgents ?? []) {
    const lane = laneStats[row.lane]
    lane.custom_agents += 1
    if (row.active) lane.active_custom_agents += 1
  }

  for (const row of tasks ?? []) {
    const lane = laneStats[row.lane]
    lane.task_counts[row.status] = (lane.task_counts[row.status] ?? 0) + 1
  }

  for (const row of messages ?? []) {
    if (row.status !== 'open') continue
    laneStats[row.to_lane].open_messages_in += 1
    laneStats[row.from_lane].open_messages_out += 1
  }

  const recentActivity = (activity ?? [])
    .filter((row) => (
      row.event_type.startsWith('agent_ops_')
      || row.event_type.startsWith('custom_agent_')
      || row.event_type.startsWith('agent_surface_')
      || row.event_type.startsWith('command_surface_')
    ))
    .slice(0, 20)

  const customProfiles = (customAgents ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    lane: row.lane,
    description: row.description,
    avatar_url: row.avatar_url,
    active: row.active,
    approval_sensitivity: row.approval_sensitivity,
    persona_tags: row.persona_tags,
    updated_at: row.updated_at,
  }))

  return mergeAuthResponse(successResponse({
    timestamp: new Date().toISOString(),
    source_errors: sourceErrors,
    backend_health: backendHealth,
    system_agents: systemAgents,
    advisors,
    custom_agents: customProfiles,
    lane_stats: AGENT_LANES.map((lane) => laneStats[lane]),
    recent: {
      tasks: (tasks ?? []).slice(0, 12),
      messages: (messages ?? []).slice(0, 12),
      decisions: (decisions ?? []).slice(0, 12),
      activity: recentActivity,
    },
    totals: {
      system_agents: systemAgents.length,
      advisors: advisors.length,
      custom_agents: customProfiles.length,
      tasks: (tasks ?? []).length,
      messages: (messages ?? []).length,
      decisions: (decisions ?? []).length,
      open_messages: (messages ?? []).filter((row) => row.status === 'open').length,
      active_custom_agents: customProfiles.filter((row) => row.active).length,
    },
  }), authResponse)
}
