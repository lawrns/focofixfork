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

// PATCH /api/bosun/kanban/tasks/[id]/status
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!authorizeBosun(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { status } = await req.json()
  if (!status) {
    return NextResponse.json({ error: 'status required' }, { status: 400 })
  }

  const supabase = supabaseAdmin()
  const { data, error } = await supabase
    .from('work_items')
    .update({ status })
    .eq('id', params.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}
