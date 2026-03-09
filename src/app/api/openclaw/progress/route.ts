import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { authRequiredResponse, badRequestResponse } from '@/lib/api/response-helpers'
import { readCommandSurfaceTrace, readOpenClawTrace } from '@/lib/runs/trace'
import type { OpenClawProgressEvent } from '@/lib/openclaw/types'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { user, supabase, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  const { searchParams } = new URL(req.url)
  const runId = searchParams.get('run_id')
  const projectId = searchParams.get('project_id')

  if (!runId && !projectId) {
    return mergeAuthResponse(badRequestResponse('run_id or project_id is required'), authResponse)
  }

  if (runId) {
    const { data: run } = await supabase
      .from('runs')
      .select('id, status, summary, created_at, started_at, ended_at, task_id, runner, trace')
      .eq('id', runId)
      .single()

    if (!run) {
      return mergeAuthResponse(NextResponse.json({ error: 'Run not found' }, { status: 404 }), authResponse)
    }

    const openclaw = readOpenClawTrace(run.trace)
    const commandSurface = readCommandSurfaceTrace(run.trace)
    const correlationId = openclaw.correlation_id ?? run.id

    const { data: ledgerEvents } = await supabase
      .from('ledger_events')
      .select('id, type, source, payload, timestamp, correlation_id, context_id')
      .or(`correlation_id.eq.${correlationId},context_id.eq.${run.id}`)
      .order('timestamp', { ascending: true })
      .limit(100)

    const events: OpenClawProgressEvent[] = (ledgerEvents ?? []).map((event) => ({
      id: event.id,
      type: event.type,
      status: typeof event.payload?.status === 'string' ? event.payload.status : null,
      message:
        (typeof event.payload?.summary === 'string' && event.payload.summary) ||
        (typeof event.payload?.message === 'string' && event.payload.message) ||
        null,
      timestamp: event.timestamp,
      correlationId: event.correlation_id ?? null,
      contextId: event.context_id ?? null,
      source: event.source ?? null,
      payload: event.payload ?? {},
    }))

    return mergeAuthResponse(NextResponse.json({
      data: {
        run,
        openclaw,
        commandSurface,
        events,
      },
    }), authResponse)
  }

  const { data: runs } = await supabase
    .from('runs')
    .select('id, status, summary, created_at, started_at, ended_at, runner, project_id, trace')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(25)

  return mergeAuthResponse(NextResponse.json({
    data: (runs ?? []).map((run) => ({
      ...run,
      openclaw: readOpenClawTrace(run.trace),
      commandSurface: readCommandSurfaceTrace(run.trace),
    })),
  }), authResponse)
}
