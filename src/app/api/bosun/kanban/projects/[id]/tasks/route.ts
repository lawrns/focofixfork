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

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!authorizeBosun(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const limit = parseInt(searchParams.get('limit') || '100')

  const supabase = supabaseAdmin()
  let query = supabase
    .from('work_items')
    .select('id, title, description, status, priority, assignee_id, due_date, agent_state, created_at, updated_at')
    .eq('project_id', params.id)
    .limit(limit)

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}
