import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function authorizeBosun(req: NextRequest): boolean {
  const token = (req.headers.get('authorization') ?? '').replace('Bearer ', '')
  const serviceToken = process.env.BOSUN_SERVICE_TOKEN
  return !!serviceToken && token === serviceToken
}

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// POST /api/bosun/kanban/tasks/[id]/ignore
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!authorizeBosun(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = supabaseAdmin()
  const { data: current } = await supabase
    .from('work_items')
    .select('agent_state')
    .eq('id', params.id)
    .single()

  const merged = { ...(current?.agent_state ?? {}), ignored: true, ignoredAt: new Date().toISOString() }

  const { error } = await supabase
    .from('work_items')
    .update({ agent_state: merged })
    .eq('id', params.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

// POST /api/bosun/kanban/tasks/[id]/unignore — handled here too via DELETE method semantics
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!authorizeBosun(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = supabaseAdmin()
  const { data: current } = await supabase
    .from('work_items')
    .select('agent_state')
    .eq('id', params.id)
    .single()

  const state = { ...(current?.agent_state ?? {}) }
  delete state.ignored
  delete state.ignoredAt

  const { error } = await supabase
    .from('work_items')
    .update({ agent_state: state })
    .eq('id', params.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
