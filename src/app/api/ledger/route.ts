import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { authRequiredResponse } from '@/lib/api/response-helpers'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { user, supabase, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')
  const source = searchParams.get('source')
  const limit = parseInt(searchParams.get('limit') || '100')
  const before = searchParams.get('before') // ISO timestamp cursor

  let query = supabase
    .from('ledger_events')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(limit)

  if (type) query = query.eq('type', type)
  if (source) query = query.eq('source', source)
  if (before) query = query.lt('timestamp', before)

  const workspace_id = searchParams.get('workspace_id')
  const user_id = searchParams.get('user_id')
  if (workspace_id) query = query.eq('workspace_id', workspace_id)
  if (user_id) query = query.eq('user_id', user_id)

  const { data, error: dbError } = await query
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  return NextResponse.json({ data })
}
