import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { authRequiredResponse } from '@/lib/api/response-helpers'

export const dynamic = 'force-dynamic'

const EVENT_TYPE = 'command_surface.execution'
const EVENT_SOURCE = 'command_surface'

export async function GET(req: NextRequest) {
  const { user, supabase, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '25', 10), 100)

  const { data, error: dbError } = await supabase
    .from('ledger_events')
    .select('id, timestamp, payload')
    .eq('source', EVENT_SOURCE)
    .eq('type', EVENT_TYPE)
    .contains('payload', { user_id: user.id })
    .order('timestamp', { ascending: false })
    .limit(limit)

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  const items = (data ?? [])
    .map((row) => row.payload as Record<string, unknown>)

  return mergeAuthResponse(NextResponse.json({ data: items }), authResponse)
}

export async function POST(req: NextRequest) {
  const { user, supabase, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const payload: Record<string, unknown> = {
    ...(body as Record<string, unknown>),
    user_id: user.id,
  }
  const runId = typeof payload.runId === 'string' && payload.runId.length > 0 ? payload.runId : null
  const status = typeof payload.status === 'string' ? payload.status : null

  const { data, error: dbError } = await supabase
    .from('ledger_events')
    .insert({
      type: EVENT_TYPE,
      source: EVENT_SOURCE,
      context_id: runId,
      payload,
      timestamp: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  if (runId && status && ['running', 'completed', 'failed', 'cancelled'].includes(status)) {
    const now = new Date().toISOString()
    const isTerminal = status === 'completed' || status === 'failed' || status === 'cancelled'
    const summary =
      typeof payload.outputPreview === 'string'
        ? payload.outputPreview
        : typeof payload.error === 'string'
          ? payload.error
          : undefined

    await supabase
      .from('runs')
      .update({
        status,
        ...(status === 'running' ? { started_at: now } : {}),
        ...(isTerminal ? { ended_at: now } : {}),
        ...(summary ? { summary } : {}),
      })
      .eq('id', runId)
  }

  return mergeAuthResponse(NextResponse.json({ success: true, id: data.id }), authResponse)
}

export async function DELETE(req: NextRequest) {
  const { user, supabase, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  const { searchParams } = new URL(req.url)
  let historyId = searchParams.get('history_id') ?? searchParams.get('id')
  let runId = searchParams.get('run_id')

  if (!historyId && !runId) {
    const body = await req.json().catch(() => null)
    if (body && typeof body === 'object') {
      const payload = body as Record<string, unknown>
      if (typeof payload.history_id === 'string' && payload.history_id.trim().length > 0) {
        historyId = payload.history_id.trim()
      } else if (typeof payload.id === 'string' && payload.id.trim().length > 0) {
        historyId = payload.id.trim()
      }
      if (typeof payload.run_id === 'string' && payload.run_id.trim().length > 0) {
        runId = payload.run_id.trim()
      }
    }
  }

  if (!historyId && !runId) {
    return NextResponse.json({ error: 'history_id or run_id is required' }, { status: 400 })
  }

  let matchQuery = supabase
    .from('ledger_events')
    .select('id')
    .eq('source', EVENT_SOURCE)
    .eq('type', EVENT_TYPE)
    .contains('payload', { user_id: user.id })

  if (historyId) {
    matchQuery = matchQuery.contains('payload', { id: historyId })
  }
  if (runId) {
    matchQuery = matchQuery.eq('context_id', runId)
  }

  const { data: rows, error: lookupError } = await matchQuery
  if (lookupError) return NextResponse.json({ error: lookupError.message }, { status: 500 })

  const rowIds = (rows ?? []).map((row) => row.id).filter(Boolean)
  if (rowIds.length === 0) {
    // Idempotent delete: missing entries are already deleted.
    return mergeAuthResponse(NextResponse.json({ success: true, deleted: 0, not_found: true }), authResponse)
  }

  const { error: deleteError } = await supabase
    .from('ledger_events')
    .delete()
    .in('id', rowIds)

  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })

  return mergeAuthResponse(NextResponse.json({ success: true, deleted: rowIds.length }), authResponse)
}
