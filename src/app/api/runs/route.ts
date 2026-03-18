import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { authRequiredResponse } from '@/lib/api/response-helpers'
import { diagnoseRunFailure } from '@/lib/runs/diagnostics'
import { readCommandSurfaceTrace } from '@/lib/runs/trace'

export const dynamic = 'force-dynamic'

type LedgerRow = {
  context_id: string | null
  payload: Record<string, unknown> | null
  source: string
  timestamp: string
  type: string
}

function toEvent(row: LedgerRow) {
  const payload = row.payload ?? {}
  const status =
    typeof payload.status === 'string'
      ? payload.status
      : row.type.includes('failed')
        ? 'failed'
        : row.type.includes('complete')
          ? 'completed'
          : undefined

  return {
    title: row.type,
    description:
      typeof payload.message === 'string'
        ? payload.message
        : typeof payload.summary === 'string'
          ? payload.summary
          : undefined,
    status,
    payload,
  }
}

export async function GET(req: NextRequest) {
  const { user, supabase, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const runner = searchParams.get('runner')
  const task_id = searchParams.get('task_id')
  const limit = parseInt(searchParams.get('limit') || '50')
  const include = new Set(
    (searchParams.get('include') ?? '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  )
  const includeDiagnostics = include.has('diagnostics')
  const includeStream = include.has('stream')

  let query = supabase
    .from('runs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (status) query = query.eq('status', status)
  if (runner) query = query.eq('runner', runner)
  if (task_id) query = query.eq('task_id', task_id)

  const { data, error: dbError } = await query
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  const failedRunIds = includeDiagnostics
    ? (data ?? []).filter((run) => run.status === 'failed').map((run) => run.id)
    : []

  const failedEventsByRunId = new Map<string, ReturnType<typeof toEvent>[]>()

  if (failedRunIds.length > 0) {
    const { data: ledgerRows } = await supabase
      .from('ledger_events')
      .select('context_id,payload,source,timestamp,type')
      .in('context_id', failedRunIds)
      .order('timestamp', { ascending: false })
      .limit(failedRunIds.length * 8)

    for (const row of (ledgerRows ?? []) as LedgerRow[]) {
      if (!row.context_id) continue
      const existing = failedEventsByRunId.get(row.context_id) ?? []
      existing.push(toEvent(row))
      failedEventsByRunId.set(row.context_id, existing)
    }
  }

  const enriched = (data ?? []).map((run) => ({
    ...run,
    ...(includeStream ? { stream: readCommandSurfaceTrace(run.trace) } : {}),
    ...(includeDiagnostics
      ? {
          diagnostics: diagnoseRunFailure({
            status: run.status,
            summary: run.summary ?? null,
            trace: run.trace,
            events: failedEventsByRunId.get(run.id) ?? [],
          }),
        }
      : {}),
  }))

  return NextResponse.json({ data: enriched })
}

export async function POST(req: NextRequest) {
  const { user, supabase, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  const body = await req.json()
  const { runner, task_id, status, summary, project_id, trace } = body

  if (!runner) return NextResponse.json({ error: 'runner required' }, { status: 400 })

  const initialStatus = status ?? 'pending'
  const startedAt = initialStatus === 'running' ? new Date().toISOString() : null

  const { data, error: dbError } = await supabase
    .from('runs')
    .insert({
      runner,
      task_id: task_id ?? null,
      project_id: project_id ?? null,
      summary: summary ?? null,
      status: initialStatus,
      started_at: startedAt,
      trace: trace ?? {},
    })
    .select()
    .single()

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  return NextResponse.json({ data }, { status: 201 })
}
