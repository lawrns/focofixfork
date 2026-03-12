import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { authRequiredResponse } from '@/lib/api/response-helpers'
import { resolveSessionFromDisk } from '@/lib/openclaw/session-resolver'

export const dynamic = 'force-dynamic'

type RunTurn = {
  id: string
  run_id: string
  idx: number
  kind: string
  prompt: string
  status: string
  outcome_kind: string | null
  preferred_model: string | null
  actual_model: string | null
  gateway_run_id: string | null
  correlation_id: string | null
  summary: string | null
  output: string | null
  session_path: string | null
  trace: Record<string, unknown>
  started_at: string | null
  ended_at: string | null
  created_at: string
  updated_at: string
}

type Artifact = {
  id: string
  run_id: string | null
  run_turn_id: string | null
  type: string
  uri: string
  meta: Record<string, unknown>
  created_at: string
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

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, supabase, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  const runId = params.id

  // Fetch run data
  const { data: run, error: runError } = await supabase
    .from('runs')
    .select('*')
    .eq('id', runId)
    .single()

  if (runError || !run) {
    return mergeAuthResponse(
      NextResponse.json({ error: runError?.message ?? 'Run not found' }, { status: 404 }),
      authResponse
    )
  }

  // Fetch all turns for this run
  const { data: turns, error: turnsError } = await supabase
    .from('run_turns')
    .select('*')
    .eq('run_id', runId)
    .order('idx', { ascending: true })

  if (turnsError) {
    return mergeAuthResponse(
      NextResponse.json({ error: turnsError.message }, { status: 500 }),
      authResponse
    )
  }

  // Fetch artifacts grouped by turn
  const { data: artifacts } = await supabase
    .from('artifacts')
    .select('*')
    .eq('run_id', runId)
    .order('created_at', { ascending: true })

  const typedTurns = (turns ?? []) as RunTurn[]
  const typedArtifacts = (artifacts ?? []) as Artifact[]

  // Group artifacts by turn
  const artifactsByTurn: Record<string, Artifact[]> = {}
  for (const artifact of typedArtifacts) {
    const turnId = artifact.run_turn_id ?? 'unassigned'
    if (!artifactsByTurn[turnId]) artifactsByTurn[turnId] = []
    artifactsByTurn[turnId].push(artifact)
  }

  // Determine active turn
  const activeTurn = typedTurns.find(t => t.status === 'running' || t.status === 'dispatched') 
    ?? typedTurns[typedTurns.length - 1] 
    ?? null

  // Build timeline from turns
  const timeline: TimelineEvent[] = []
  for (const turn of typedTurns) {
    timeline.push({
      id: `turn-created:${turn.id}`,
      kind: 'lifecycle',
      title: `Turn ${turn.idx + 1} (${turn.kind})`,
      description: turn.prompt.slice(0, 200) + (turn.prompt.length > 200 ? '...' : ''),
      status: turn.status === 'completed' ? 'completed' 
        : turn.status === 'failed' ? 'failed' 
        : turn.status === 'cancelled' ? 'cancelled'
        : turn.status === 'running' ? 'running'
        : 'pending',
      source: 'openclaw',
      timestamp: turn.created_at,
    })

    if (turn.started_at && turn.started_at !== turn.created_at) {
      timeline.push({
        id: `turn-started:${turn.id}`,
        kind: 'execution',
        title: `Turn ${turn.idx + 1} started`,
        status: 'running',
        source: 'openclaw',
        timestamp: turn.started_at,
      })
    }

    if (turn.ended_at) {
      timeline.push({
        id: `turn-ended:${turn.id}`,
        kind: 'execution',
        title: `Turn ${turn.idx + 1} ${turn.outcome_kind ?? 'completed'}`,
        status: turn.outcome_kind === 'failed' ? 'failed' 
          : turn.outcome_kind === 'cancelled' ? 'cancelled'
          : 'completed',
        source: 'openclaw',
        timestamp: turn.ended_at,
      })
    }
  }

  // Determine outcome
  const outcome = activeTurn?.outcome_kind ?? null

  // Resolve session if we have a correlation_id
  let session = null
  let inspector = null
  if (activeTurn?.correlation_id || activeTurn?.run_id) {
    session = await resolveSessionFromDisk(
      activeTurn.run_id,
      activeTurn.correlation_id ?? ''
    )
  }

  // Build inspector data from traces
  inspector = {
    turns: typedTurns.map(t => ({
      id: t.id,
      idx: t.idx,
      kind: t.kind,
      status: t.status,
      outcome_kind: t.outcome_kind,
      preferred_model: t.preferred_model,
      actual_model: t.actual_model,
      gateway_run_id: t.gateway_run_id,
      correlation_id: t.correlation_id,
      trace_keys: Object.keys(t.trace ?? {}),
      has_output: !!t.output,
      has_session_path: !!t.session_path,
    })),
    run_trace: run.trace ?? {},
  }

  return mergeAuthResponse(
    NextResponse.json({
      data: {
        thread: {
          run_id: runId,
          runner: run.runner,
          status: run.status,
          summary: run.summary,
          created_at: run.created_at,
          ended_at: run.ended_at,
        },
        turns: typedTurns,
        active_turn: activeTurn,
        outcome,
        session: session ? {
          path: session.path,
          assistant_output: session.assistant_output?.slice(0, 2000),
          tool_count: session.tool_markers?.length ?? 0,
          cwd: session.cwd,
        } : null,
        artifacts_by_turn: artifactsByTurn,
        inspector,
        timeline,
      },
    }),
    authResponse
  )
}
