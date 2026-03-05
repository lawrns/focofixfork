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
    .order('timestamp', { ascending: false })
    .limit(limit)

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  const items = (data ?? [])
    .map((row) => row.payload as Record<string, unknown>)
    .filter((payload) => payload.user_id === user.id)

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
