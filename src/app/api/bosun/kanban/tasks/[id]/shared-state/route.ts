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

// GET /api/bosun/kanban/tasks/[id]/shared-state
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!authorizeBosun(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = supabaseAdmin()
  const { data, error } = await supabase
    .from('work_items')
    .select('agent_state')
    .eq('id', params.id)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 })
  }

  return NextResponse.json({ data: data.agent_state ?? {} })
}

// POST /api/bosun/kanban/tasks/[id]/shared-state — merge patch
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!authorizeBosun(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const patch = await req.json()

  const supabase = supabaseAdmin()

  // Read current state, merge, write back
  const { data: current, error: readError } = await supabase
    .from('work_items')
    .select('agent_state')
    .eq('id', params.id)
    .single()

  if (readError) {
    return NextResponse.json({ error: readError.message }, { status: 404 })
  }

  const merged = { ...(current.agent_state ?? {}), ...patch }

  const { data, error } = await supabase
    .from('work_items')
    .update({ agent_state: merged })
    .eq('id', params.id)
    .select('agent_state')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data: data.agent_state })
}
