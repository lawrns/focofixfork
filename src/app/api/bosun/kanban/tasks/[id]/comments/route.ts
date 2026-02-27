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

// POST /api/bosun/kanban/tasks/[id]/comments
// Body: { content: string, user_id: string (UUID of user on whose behalf Bosun acts) }
// Note: foco_comments requires user_id NOT NULL (FK to auth.users). Bosun must pass
// the user_id of the workspace member it's acting on behalf of.
// If no user_id available, use append-to-agent_state fallback.
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!authorizeBosun(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { content, user_id } = await req.json()
  if (!content) {
    return NextResponse.json({ error: 'content required' }, { status: 400 })
  }

  const supabase = supabaseAdmin()

  // If no user_id provided, fall back to appending to agent_state log
  if (!user_id) {
    const { data: current } = await supabase
      .from('work_items')
      .select('agent_state')
      .eq('id', params.id)
      .single()

    const state = current?.agent_state ?? {}
    const log: Array<{ ts: string; content: string }> = Array.isArray(state.bosun_log) ? state.bosun_log : []
    log.push({ ts: new Date().toISOString(), content })

    const { error } = await supabase
      .from('work_items')
      .update({ agent_state: { ...state, bosun_log: log } })
      .eq('id', params.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: { fallback: 'agent_state', entry: log[log.length - 1] } }, { status: 201 })
  }

  // user_id provided — insert into foco_comments
  const { data, error } = await supabase
    .from('foco_comments')
    .insert({
      work_item_id: params.id,
      user_id,
      content,
      is_ai_generated: true,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data }, { status: 201 })
}
