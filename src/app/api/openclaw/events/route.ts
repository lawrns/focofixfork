import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function authorizeOpenClaw(req: NextRequest): boolean {
  const token = (req.headers.get('authorization') ?? '').replace('Bearer ', '')
  const serviceToken = process.env.OPENCLAW_SERVICE_TOKEN ?? process.env.BOSUN_SERVICE_TOKEN
  if (!serviceToken) return false
  return token === serviceToken
}

// POST /api/openclaw/events — ingest browser automation events into ledger
export async function POST(req: NextRequest) {
  if (!authorizeOpenClaw(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { type, source, context_id, correlation_id, causation_id, payload, run_id, artifacts } = body

  if (!type || !source) {
    return NextResponse.json({ error: 'type and source required' }, { status: 400 })
  }

  const supabase = supabaseAdmin()

  // Write ledger event
  const { data: ledgerEvent, error: ledgerError } = await supabase
    .from('ledger_events')
    .insert({
      type,
      source,
      context_id: context_id ?? null,
      correlation_id: correlation_id ?? null,
      causation_id: causation_id ?? null,
      payload: payload ?? {},
    })
    .select()
    .single()

  if (ledgerError) {
    return NextResponse.json({ error: ledgerError.message }, { status: 500 })
  }

  // Optionally update run status
  if (run_id && payload?.status) {
    await supabase
      .from('runs')
      .update({ status: payload.status, summary: payload.summary ?? null })
      .eq('id', run_id)
  }

  // Optionally create artifacts (screenshots/logs)
  if (artifacts && Array.isArray(artifacts) && artifacts.length > 0) {
    const rows = artifacts.map((a: { type: string; uri: string; meta?: Record<string, unknown> }) => ({
      run_id: run_id ?? null,
      type: a.type,
      uri: a.uri,
      meta: a.meta ?? {},
    }))
    await supabase.from('artifacts').insert(rows)
  }

  return NextResponse.json({ data: ledgerEvent }, { status: 201 })
}

// GET /api/openclaw/events — recent events
export async function GET(req: NextRequest) {
  if (!authorizeOpenClaw(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const limit = parseInt(searchParams.get('limit') || '50')
  const type = searchParams.get('type')

  const supabase = supabaseAdmin()
  let query = supabase
    .from('ledger_events')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(limit)

  if (type) {
    query = query.eq('type', type)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}
