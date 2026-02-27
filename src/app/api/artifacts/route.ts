import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { authRequiredResponse } from '@/lib/api/response-helpers'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { user, supabase, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  const { searchParams } = new URL(req.url)
  const run_id = searchParams.get('run_id')
  const task_id = searchParams.get('task_id')
  const type = searchParams.get('type')
  const limit = parseInt(searchParams.get('limit') || '50')

  let query = supabase
    .from('artifacts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (run_id) query = query.eq('run_id', run_id)
  if (task_id) query = query.eq('task_id', task_id)
  if (type) query = query.eq('type', type)

  const { data, error: dbError } = await query
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  return NextResponse.json({ data })
}
