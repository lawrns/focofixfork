import type { NextRequest } from 'next/server'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { resolvePrimaryWorkspace } from '@/server/workspaces/primary'
import type { MissionControlActivity, MissionControlAttentionItem, MissionControlSnapshot, MissionControlTaskCard, MissionControlVisualState } from '@/features/mission-control/types'
import type { AgentOption, LedgerEvent, Run } from '@/components/dashboard/use-dashboard-data'
import type { OpenClawRuntimeSnapshot } from '@/lib/openclaw/types'

type TaskRecord = {
  id: string
  title: string
  status: string
  priority: string | null
  project_id: string
  run_id: string | null
  delegation_status: string | null
  assigned_agent: string | null
  due_date: string | null
  updated_at: string
  blocked_reason?: string | null
  metadata?: Record<string, unknown> | null
  project?: {
    id: string
    name: string
    slug?: string | null
  } | null
}

type TaskExecutionEventRecord = {
  id: string
  work_item_id: string
  project_id: string | null
  event_type: string
  summary: string
  details: Record<string, unknown> | null
  created_at: string
}

type OperatorPulseResponse = {
  generatedAt?: string
  gateway?: {
    healthy?: boolean
    primaryModel?: string | null
    attachedTabs?: number
  }
  crons?: {
    total?: number
    enabled?: number
    healthy?: number
    degraded?: number
    failing?: number
  }
  workspace?: {
    path?: string | null
  }
  system?: {
    cpuPercent?: number
    memPercent?: number
  }
  alerts?: Array<{
    level: 'critical' | 'warning' | 'info'
    message: string
    source: string
    at: string
  }>
  signalStrength?: 0 | 1 | 2 | 3 | 4 | 5
}

type DashboardCockpitPayload = {
  openclawRuntime: OpenClawRuntimeSnapshot | null
  allRuns: Run[]
  recentEvents: LedgerEvent[]
  agents: AgentOption[]
  proposals: Array<{
    id: string
    title: string
    status: string
    created_at: string
    project?: {
      id: string
      name: string
      slug?: string | null
    } | null
  }>
}

function cookieHeaders(req: NextRequest): HeadersInit {
  const headers: Record<string, string> = {}
  const cookie = req.headers.get('cookie')
  const authorization = req.headers.get('authorization')
  if (cookie) headers.cookie = cookie
  if (authorization) headers.authorization = authorization
  if (process.env.FOCO_LOCAL_TOKEN) headers['x-foco-local-token'] = process.env.FOCO_LOCAL_TOKEN
  return headers
}

async function fetchInternalJson<T>(req: NextRequest, path: string): Promise<T | null> {
  try {
    const res = await fetch(new URL(path, req.nextUrl.origin), {
      headers: cookieHeaders(req),
      cache: 'no-store',
    })
    if (!res.ok) return null
    return await res.json() as T
  } catch {
    return null
  }
}

function readMetadataSection(metadata: Record<string, unknown> | null | undefined, key: string): Record<string, unknown> | null {
  const section = metadata?.[key]
  return section && typeof section === 'object' && !Array.isArray(section)
    ? section as Record<string, unknown>
    : null
}

export function getTaskVisualState(task: {
  status: string
  delegationStatus?: string | null
  verificationRequired?: boolean
  verificationStatus?: string | null
}): MissionControlVisualState {
  if (task.status === 'blocked') return 'blocked'
  if (task.delegationStatus === 'failed') return 'failed'
  if (task.delegationStatus === 'running' || task.status === 'in_progress') return 'running'
  if (task.verificationRequired && task.status === 'review' && task.verificationStatus !== 'passed') return 'verifying'
  if (task.delegationStatus === 'pending' || task.delegationStatus === 'delegated') return 'queued'
  if (task.status === 'done' || task.delegationStatus === 'completed') return 'completed'
  return 'idle'
}

function getTaskAttention(task: {
  status: string
  priority?: string | null
  delegationStatus?: string | null
  verificationRequired?: boolean
  verificationStatus?: string | null
}): MissionControlTaskCard['attention'] {
  if (task.status === 'blocked' || task.delegationStatus === 'failed') return 'critical'
  if (task.priority === 'urgent' || task.priority === 'high') return 'warning'
  if (task.verificationRequired && task.verificationStatus !== 'passed') return 'info'
  return 'none'
}

function sortTasks(tasks: MissionControlTaskCard[]): MissionControlTaskCard[] {
  const stateOrder: Record<MissionControlVisualState, number> = {
    blocked: 0,
    failed: 1,
    running: 2,
    queued: 3,
    verifying: 4,
    waiting_human: 5,
    idle: 6,
    completed: 7,
  }
  const attentionOrder: Record<MissionControlTaskCard['attention'], number> = {
    critical: 0,
    warning: 1,
    info: 2,
    none: 3,
  }

  return [...tasks].sort((left, right) => {
    const attentionDelta = attentionOrder[left.attention] - attentionOrder[right.attention]
    if (attentionDelta !== 0) return attentionDelta
    const stateDelta = stateOrder[left.visualState] - stateOrder[right.visualState]
    if (stateDelta !== 0) return stateDelta
    return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
  })
}

function mapTaskCards(tasks: TaskRecord[]): MissionControlTaskCard[] {
  return sortTasks(tasks.map((task) => {
    const metadata = task.metadata ?? {}
    const executionState = readMetadataSection(metadata, 'execution_state')
    const verificationSummary = readMetadataSection(metadata, 'verification_summary')
    const verificationRequired = Boolean(verificationSummary?.required)
    const verificationStatus = typeof verificationSummary?.latest_status === 'string'
      ? verificationSummary.latest_status
      : null
    const latestEvent = typeof executionState?.latest_event === 'string'
      ? executionState.latest_event
      : null
    const latestSummary = typeof executionState?.summary === 'string'
      ? executionState.summary
      : typeof verificationSummary?.latest_summary === 'string'
        ? verificationSummary.latest_summary
        : null

    const visualState = getTaskVisualState({
      status: task.status,
      delegationStatus: task.delegation_status,
      verificationRequired,
      verificationStatus,
    })

    return {
      id: task.id,
      title: task.title,
      status: task.status,
      priority: task.priority,
      projectId: task.project_id,
      projectName: task.project?.name ?? 'Project',
      projectSlug: task.project?.slug ?? null,
      delegationStatus: task.delegation_status ?? null,
      assignedAgent: task.assigned_agent ?? null,
      runId: task.run_id ?? null,
      dueDate: task.due_date ?? null,
      updatedAt: task.updated_at,
      latestEvent,
      latestSummary,
      blockedReason: task.blocked_reason ?? null,
      verificationRequired,
      verificationStatus,
      visualState,
      attention: getTaskAttention({
        status: task.status,
        priority: task.priority,
        delegationStatus: task.delegation_status,
        verificationRequired,
        verificationStatus,
      }),
      href: `/tasks/${task.id}`,
    }
  }))
}

function mapRunActivity(runs: Run[]): MissionControlActivity[] {
  return runs.slice(0, 12).map((run) => {
    const status = run.status
    const isFailed = status === 'failed' || status === 'error'
    const isCompleted = status === 'completed'
    const isRunning = status === 'running' || status === 'pending'
    return {
      id: `run-${run.id}`,
      timestamp: run.ended_at ?? run.started_at ?? run.created_at,
      scope: 'run',
      kind: isFailed ? 'failed' : isCompleted ? 'completed' : isRunning ? 'progress' : 'commentary',
      attention: isFailed ? 'critical' : isRunning ? 'info' : 'none',
      visualState: isFailed ? 'failed' : isCompleted ? 'completed' : isRunning ? 'running' : 'idle',
      title: run.summary || `Run ${run.id.slice(0, 8)}`,
      summary: `${run.runner || 'agent'} ${status}`,
      source: run.runner || 'agent',
      href: `/runs/${run.id}`,
      entity: { type: 'run', id: run.id, label: run.runner || 'agent' },
      correlationId: run.id,
      payload: run.trace ?? null,
    }
  })
}

function mapLedgerActivity(events: LedgerEvent[]): MissionControlActivity[] {
  return events.slice(0, 16).map((event) => {
    const type = event.type.toLowerCase()
    const isFailed = type.includes('fail') || type.includes('error')
    const isCompleted = type.includes('done') || type.includes('complete') || type.includes('success')
    const isProgress = type.includes('run') || type.includes('progress') || type.includes('start')
    return {
      id: `ledger-${event.id}`,
      timestamp: event.timestamp,
      scope: 'workspace',
      kind: isFailed ? 'failed' : isCompleted ? 'completed' : isProgress ? 'progress' : 'commentary',
      attention: isFailed ? 'warning' : 'none',
      visualState: isFailed ? 'failed' : isCompleted ? 'completed' : isProgress ? 'running' : 'idle',
      title: event.type,
      summary: typeof event.payload?.summary === 'string'
        ? event.payload.summary
        : typeof event.payload?.message === 'string'
          ? event.payload.message
          : event.source ?? event.type,
      source: event.source ?? 'ledger',
      payload: event.payload ?? null,
    }
  })
}

function mapTaskExecutionActivity(events: TaskExecutionEventRecord[], taskMap: Map<string, MissionControlTaskCard>): MissionControlActivity[] {
  return events.slice(0, 18).map((event) => {
    const type = event.event_type.toLowerCase()
    const linkedTask = taskMap.get(event.work_item_id)
    const isBlocked = type.includes('block')
    const isFailed = type.includes('fail')
    const isCompleted = type.includes('complete') || type.includes('verified') || type.includes('passed')
    const isApproval = type.includes('approval')
    return {
      id: `task-event-${event.id}`,
      timestamp: event.created_at,
      scope: 'task',
      kind: isBlocked
        ? 'blocked'
        : isFailed
          ? 'failed'
          : isCompleted
            ? 'completed'
            : isApproval
              ? 'approval_needed'
              : 'status_changed',
      attention: isBlocked || isFailed ? 'critical' : isApproval ? 'warning' : 'info',
      visualState: isBlocked ? 'blocked' : isFailed ? 'failed' : isCompleted ? 'completed' : isApproval ? 'waiting_human' : 'running',
      title: linkedTask?.title ?? 'Task activity',
      summary: event.summary,
      source: 'task_execution',
      href: linkedTask?.href,
      entity: { type: 'task', id: event.work_item_id, label: linkedTask?.title ?? null },
      correlationId: event.work_item_id,
      payload: event.details ?? null,
    }
  })
}

function mapMachineActivity(operator: OperatorPulseResponse): MissionControlActivity[] {
  return (operator.alerts ?? []).slice(0, 8).map((alert, index) => ({
    id: `machine-${index}-${alert.at}`,
    timestamp: alert.at,
    scope: 'machine',
    kind: alert.level === 'critical' ? 'failed' : alert.level === 'warning' ? 'blocked' : 'heartbeat',
    attention: alert.level === 'critical' ? 'critical' : alert.level === 'warning' ? 'warning' : 'info',
    visualState: alert.level === 'critical' ? 'failed' : alert.level === 'warning' ? 'blocked' : 'idle',
    title: alert.source,
    summary: alert.message,
    source: 'operator_pulse',
    payload: null,
  }))
}

function sortActivity(items: MissionControlActivity[]): MissionControlActivity[] {
  return [...items]
    .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())
    .slice(0, 40)
}

export function buildAttentionItems(args: {
  tasks: MissionControlTaskCard[]
  runs: Run[]
  proposals: MissionControlSnapshot['proposals']
  operator: OperatorPulseResponse
  agents: AgentOption[]
}): MissionControlAttentionItem[] {
  const items: MissionControlAttentionItem[] = []

  for (const task of args.tasks) {
    if (task.attention === 'critical' || task.attention === 'warning') {
      items.push({
        id: `task-${task.id}`,
        level: task.attention === 'critical' ? 'critical' : 'warning',
        title: task.title,
        summary: task.blockedReason || task.latestSummary || `${task.projectName} needs attention`,
        href: task.href,
        category: 'task',
      })
    }
  }

  for (const run of args.runs) {
    if (run.status === 'failed' || run.status === 'error') {
      items.push({
        id: `run-${run.id}`,
        level: 'critical',
        title: run.summary || `Run ${run.id.slice(0, 8)}`,
        summary: `${run.runner || 'agent'} failed and needs operator review.`,
        href: `/runs/${run.id}`,
        category: 'run',
      })
    }
  }

  for (const proposal of args.proposals) {
    if (proposal.status === 'pending_review' || proposal.status === 'pending' || proposal.status === 'in_review') {
      items.push({
        id: `proposal-${proposal.id}`,
        level: 'info',
        title: proposal.title,
        summary: 'Proposal is waiting for approval or review.',
        category: 'proposal',
      })
    }
  }

  for (const alert of args.operator.alerts ?? []) {
    if (alert.level === 'critical' || alert.level === 'warning') {
      items.push({
        id: `machine-${alert.source}-${alert.at}`,
        level: alert.level,
        title: alert.source,
        summary: alert.message,
        category: 'machine',
      })
    }
  }

  for (const agent of args.agents) {
    if (agent.status === 'error') {
      items.push({
        id: `agent-${agent.id}`,
        level: 'critical',
        title: agent.name,
        summary: 'Agent is reporting an error state.',
        category: 'agent',
      })
    }
  }

  const order: Record<MissionControlAttentionItem['level'], number> = {
    critical: 0,
    warning: 1,
    info: 2,
  }

  return items
    .sort((left, right) => order[left.level] - order[right.level])
    .slice(0, 10)
}

function buildMetrics(args: {
  tasks: MissionControlTaskCard[]
  runs: Run[]
  proposals: MissionControlSnapshot['proposals']
  machine: MissionControlSnapshot['machine']
  agents: AgentOption[]
}): MissionControlSnapshot['metrics'] {
  const activeRuns = args.runs.filter((run) => run.status === 'running' || run.status === 'pending').length
  const delegatedTasks = args.tasks.filter((task) => ['pending', 'delegated', 'running'].includes(task.delegationStatus ?? '')).length
  const blockedItems = args.tasks.filter((task) => task.visualState === 'blocked').length
  const approvals = args.proposals.filter((proposal) => ['pending_review', 'pending', 'in_review'].includes(proposal.status)).length
  const activeAgents = args.agents.filter((agent) => ['working', 'busy', 'running'].includes(agent.status)).length

  return [
    {
      id: 'active-runs',
      label: 'Active Runs',
      value: String(activeRuns),
      detail: activeRuns > 0 ? 'Visible execution in flight' : 'Fleet is currently calm',
      tone: activeRuns > 0 ? 'good' : 'neutral',
    },
    {
      id: 'delegated-tasks',
      label: 'Delegated Tasks',
      value: String(delegatedTasks),
      detail: delegatedTasks > 0 ? 'Tasks linked to live delegation states' : 'No delegated work in queue',
      tone: delegatedTasks > 0 ? 'good' : 'neutral',
    },
    {
      id: 'blocked-work',
      label: 'Blocked Work',
      value: String(blockedItems),
      detail: blockedItems > 0 ? 'Execution requires intervention' : 'No task-level blockers detected',
      tone: blockedItems > 0 ? 'critical' : 'good',
    },
    {
      id: 'approvals',
      label: 'Approvals',
      value: String(approvals),
      detail: approvals > 0 ? 'Items waiting on operator review' : 'No approvals waiting',
      tone: approvals > 0 ? 'warning' : 'good',
    },
    {
      id: 'machine-signal',
      label: 'Machine Signal',
      value: `${args.machine.signalStrength}/5`,
      detail: `${args.machine.cpuPercent}% CPU • ${args.machine.memPercent}% memory • ${activeAgents} active agents`,
      tone: args.machine.signalStrength >= 4 ? 'good' : args.machine.signalStrength >= 2 ? 'warning' : 'critical',
    },
  ]
}

export async function buildMissionControlSnapshot(args: {
  req: NextRequest
  user: User
  supabase: SupabaseClient
}): Promise<MissionControlSnapshot> {
  const [workspaceResolution, cockpitJson, operatorJson] = await Promise.all([
    resolvePrimaryWorkspace({ user: args.user, client: args.supabase, createIfMissing: false }),
    fetchInternalJson<{ data?: DashboardCockpitPayload }>(args.req, '/api/dashboard/cockpit'),
    fetchInternalJson<OperatorPulseResponse>(args.req, '/api/openclaw/operator-pulse'),
  ])

  const workspaceId = workspaceResolution.ok ? workspaceResolution.workspaceId : null
  const tasksJson = workspaceId
    ? await fetchInternalJson<{ data?: { data?: TaskRecord[] } }>(
      args.req,
      `/api/tasks?workspace_id=${encodeURIComponent(workspaceId)}&limit=18`
    )
    : null

  const tasks = Array.isArray(tasksJson?.data?.data) ? tasksJson.data.data : []

  const { data: projects } = workspaceId
    ? await args.supabase
      .from('foco_projects')
      .select('id, name, slug')
      .eq('workspace_id', workspaceId)
      .limit(40)
    : { data: [] as Array<{ id: string; name: string; slug?: string | null }> }

  const projectMap = new Map((projects ?? []).map((project) => [project.id, project]))
  const enrichedTasks = tasks.map((task) => ({
    ...task,
    project: projectMap.get(task.project_id) ?? null,
  }))

  const { data: taskExecutionEvents } = workspaceId
    ? await args.supabase
      .from('task_execution_events')
      .select('id, work_item_id, project_id, event_type, summary, details, created_at')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(24)
    : { data: [] as TaskExecutionEventRecord[] }

  const cockpit = cockpitJson?.data ?? {
    openclawRuntime: null,
    allRuns: [],
    recentEvents: [],
    agents: [],
    proposals: [],
  }

  const machine: MissionControlSnapshot['machine'] = {
    signalStrength: operatorJson?.signalStrength ?? 0,
    gatewayHealthy: operatorJson?.gateway?.healthy ?? false,
    primaryModel: operatorJson?.gateway?.primaryModel ?? cockpit.openclawRuntime?.modelAlias ?? cockpit.openclawRuntime?.primaryModel ?? null,
    attachedTabs: operatorJson?.gateway?.attachedTabs ?? cockpit.openclawRuntime?.attachedTabs ?? 0,
    cpuPercent: operatorJson?.system?.cpuPercent ?? 0,
    memPercent: operatorJson?.system?.memPercent ?? 0,
    workspacePath: operatorJson?.workspace?.path ?? cockpit.openclawRuntime?.workspacePath ?? null,
    cronSummary: {
      total: operatorJson?.crons?.total ?? 0,
      enabled: operatorJson?.crons?.enabled ?? 0,
      healthy: operatorJson?.crons?.healthy ?? 0,
      degraded: operatorJson?.crons?.degraded ?? 0,
      failing: operatorJson?.crons?.failing ?? 0,
    },
    alerts: operatorJson?.alerts ?? [],
  }

  const taskCards = mapTaskCards(enrichedTasks)
  const taskMap = new Map(taskCards.map((task) => [task.id, task]))
  const activity = sortActivity([
    ...mapMachineActivity(operatorJson ?? {}),
    ...mapTaskExecutionActivity((taskExecutionEvents ?? []) as TaskExecutionEventRecord[], taskMap),
    ...mapRunActivity(cockpit.allRuns ?? []),
    ...mapLedgerActivity(cockpit.recentEvents ?? []),
  ])

  return {
    snapshotAt: new Date().toISOString(),
    workspaceId,
    runtime: cockpit.openclawRuntime ?? null,
    machine,
    metrics: buildMetrics({
      tasks: taskCards,
      runs: cockpit.allRuns ?? [],
      proposals: cockpit.proposals ?? [],
      machine,
      agents: cockpit.agents ?? [],
    }),
    attention: buildAttentionItems({
      tasks: taskCards,
      runs: cockpit.allRuns ?? [],
      proposals: cockpit.proposals ?? [],
      operator: operatorJson ?? {},
      agents: cockpit.agents ?? [],
    }),
    activity,
    tasks: taskCards.slice(0, 10),
    runs: cockpit.allRuns ?? [],
    signals: cockpit.recentEvents ?? [],
    agents: cockpit.agents ?? [],
    proposals: cockpit.proposals ?? [],
  }
}
