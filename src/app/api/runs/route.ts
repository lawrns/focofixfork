import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { authRequiredResponse } from '@/lib/api/response-helpers'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { user, supabase, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const runner = searchParams.get('runner')
  const task_id = searchParams.get('task_id')
  const limit = parseInt(searchParams.get('limit') || '50')

  let query = supabase
    .from('runs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (status) query = query.eq('status', status)
  if (runner) query = query.eq('runner', runner)
  if (task_id) query = query.eq('task_id', task_id)

  const { data, error: dbError } = await query
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  const { user, supabase, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  const body = await req.json()
  const { runner, task_id, status } = body

  if (!runner) return NextResponse.json({ error: 'runner required' }, { status: 400 })

  const { data, error: dbError } = await supabase
    .from('runs')
    .insert({ runner, task_id: task_id ?? null, status: status ?? 'pending' })
    .select()
    .single()

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  return NextResponse.json({ data }, { status: 201 })
}
