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

// GET /api/bosun/kanban/projects — list all projects
export async function GET(req: NextRequest) {
  if (!authorizeBosun(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const workspace_id = searchParams.get('workspace_id')

  const supabase = supabaseAdmin()
  let query = supabase
    .from('foco_projects')
    .select('id, name, description, status, workspace_id, created_at, updated_at')
    .order('created_at', { ascending: false })

  if (workspace_id) {
    query = query.eq('workspace_id', workspace_id)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}
