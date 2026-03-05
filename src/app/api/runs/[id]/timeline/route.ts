import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { authRequiredResponse } from '@/lib/api/response-helpers'

export const dynamic = 'force-dynamic'

type LedgerRow = {
  id: string
  type: string
  source: string
  timestamp: string
  context_id: string | null
  payload: Record<string, unknown> | null
}

type TimelineEvent = {
  id: string
  kind: 'lifecycle' | 'execution' | 'audit'
  title: string
  description?: string
  status?: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'info'
  source: string
  timestamp: string
  payload?: Record<string, unknown> | null
}

function inferRunStatusFromLedger(rows: LedgerRow[]): 'completed' | 'failed' | 'cancelled' | null {
  for (let i = rows.length - 1; i >= 0; i--) {
    const payload = rows[i].payload ?? {}
    const status = typeof payload.status === 'string' ? payload.status.toLowerCase() : null
    if (status === 'completed' || status === 'failed' || status === 'cancelled') {
      return status
    }
  }
  return null
}

function dedupeById<T extends { id: string }>(rows: T[]): T[] {
  const seen = new Set<string>()
  const out: T[] = []
  for (const row of rows) {
    if (seen.has(row.id)) continue
    seen.add(row.id)
    out.push(row)
  }
  return out
}

function mapLedgerEvent(evt: LedgerRow): TimelineEvent {
  const payload = evt.payload ?? {}
  const title = evt.type.replace(/\./g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  const payloadStatus =
    typeof payload.status === 'string'
      ? payload.status.toLowerCase()
      : null
  const status =
    payloadStatus === 'completed' || payloadStatus === 'failed' || payloadStatus === 'running' || payloadStatus === 'cancelled'
      ? payloadStatus
      :
    evt.type.includes('failed') ? 'failed' :
    evt.type.includes('cancel') ? 'cancelled' :
    evt.type.includes('resume') ? 'running' :
    evt.type.includes('complete') ? 'completed' :
    'info'

  let description: string | undefined
  if (typeof payload.message === 'string') description = payload.message
  else if (typeof payload.summary === 'string') description = payload.summary
  else if (typeof payload.status === 'string') description = `Status: ${payload.status}`

  const kind: TimelineEvent['kind'] =
    evt.source === 'policy' || evt.type.startsWith('policy.') || evt.type.startsWith('fleet.')
      ? 'audit'
      : 'execution'

  return {
    id: `ledger:${evt.id}`,
    kind,
    title,
    description,
    status,
    source: evt.source,
    timestamp: evt.timestamp,
    payload: evt.payload,
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, supabase, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  const runId = params.id

  const { data: run, error: runError } = await supabase
    .from('runs')
    .select('*, run_steps(*)')
    .eq('id', runId)
    .single()

  if (runError || !run) {
    return mergeAuthResponse(
      NextResponse.json({ error: runError?.message ?? 'Run not found' }, { status: 404 }),
      authResponse
    )
  }

  const [contextEventsRes, payloadSnakeRes, payloadCamelRes, commandSurfaceRes] = await Promise.all([
    supabase
      .from('ledger_events')
      .select('id,type,source,timestamp,context_id,payload')
      .eq('context_id', runId)
      .order('timestamp', { ascending: true })
      .limit(200),
    supabase
      .from('ledger_events')
      .select('id,type,source,timestamp,context_id,payload')
      .filter('payload->>run_id', 'eq', runId)
      .order('timestamp', { ascending: true })
      .limit(200),
    supabase
      .from('ledger_events')
      .select('id,type,source,timestamp,context_id,payload')
      .filter('payload->>runId', 'eq', runId)
      .order('timestamp', { ascending: true })
      .limit(200),
    supabase
      .from('ledger_events')
      .select('id,type,source,timestamp,context_id,payload')
      .eq('type', 'command_surface.execution')
      .eq('source', 'command_surface')
      .filter('payload->>runId', 'eq', runId)
      .order('timestamp', { ascending: true })
      .limit(100),
  ])

  const ledgerRows = dedupeById<LedgerRow>([
    ...((contextEventsRes.data ?? []) as LedgerRow[]),
    ...((payloadSnakeRes.data ?? []) as LedgerRow[]),
    ...((payloadCamelRes.data ?? []) as LedgerRow[]),
    ...((commandSurfaceRes.data ?? []) as LedgerRow[]),
  ]).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

  const inferredRunStatus = inferRunStatusFromLedger(ledgerRows)
  if (run.status === 'running' && inferredRunStatus) {
    run.status = inferredRunStatus
    run.ended_at = run.ended_at ?? new Date().toISOString()
    // Best-effort self-heal for stale runs created before status sync improvements.
    void supabase
      .from('runs')
      .update({ status: inferredRunStatus, ended_at: run.ended_at })
      .eq('id', runId)
  }

  const timeline: TimelineEvent[] = []

  timeline.push({
    id: `run-created:${run.id}`,
    kind: 'lifecycle',
    title: 'Run created',
    status: 'pending',
    source: run.runner ?? 'system',
    timestamp: run.created_at,
    description: run.summary ?? undefined,
  })

  if (run.started_at) {
    timeline.push({
      id: `run-started:${run.id}`,
      kind: 'lifecycle',
      title: 'Execution started',
      status: 'running',
      source: run.runner ?? 'system',
      timestamp: run.started_at,
    })
  }

  const runSteps = (run.run_steps ?? []) as Array<{
    id: string
    type: string
    created_at: string
    input?: Record<string, unknown> | null
  }>

  for (const step of runSteps) {
    timeline.push({
      id: `step:${step.id}`,
      kind: 'execution',
      title: step.type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      description:
        step.input && typeof step.input === 'object'
          ? `Input keys: ${Object.keys(step.input).join(', ')}`
          : undefined,
      status: run.status === 'failed' ? 'failed' : run.status === 'cancelled' ? 'cancelled' : 'completed',
      source: run.runner ?? 'run-step',
      timestamp: step.created_at,
      payload: step.input ?? null,
    })
  }

  for (const ledgerRow of ledgerRows) {
    timeline.push(mapLedgerEvent(ledgerRow))
  }

  if (run.ended_at) {
    timeline.push({
      id: `run-ended:${run.id}`,
      kind: 'lifecycle',
      title: 'Execution finished',
      status: (run.status as TimelineEvent['status']) ?? 'info',
      source: run.runner ?? 'system',
      timestamp: run.ended_at,
    })
  }

  const rank = (evt: TimelineEvent): number => {
    if (evt.id.startsWith('run-created:')) return 0
    if (evt.id.startsWith('run-started:')) return 1
    if (evt.id.startsWith('run-ended:')) return 3
    return 2
  }
  timeline.sort((a, b) => {
    const t = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    if (t !== 0) return t
    return rank(a) - rank(b)
  })

  const { data: artifacts } = await supabase
    .from('artifacts')
    .select('*')
    .eq('run_id', runId)
    .order('created_at', { ascending: true })

  const auditEvents = timeline.filter((evt) => evt.kind === 'audit')
  const executionEvents = timeline.filter((evt) => evt.kind === 'execution' || evt.kind === 'lifecycle')

  return mergeAuthResponse(
    NextResponse.json({
      data: {
        run,
        artifacts: artifacts ?? [],
        timeline,
        execution_events: executionEvents,
        audit_events: auditEvents,
        has_timeline: timeline.length > 0,
        last_event_at: timeline.length > 0 ? timeline[timeline.length - 1].timestamp : null,
      },
    }),
    authResponse
  )
}
