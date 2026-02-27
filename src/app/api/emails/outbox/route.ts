import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { authRequiredResponse } from '@/lib/api/response-helpers'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { user, supabase, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const limit = parseInt(searchParams.get('limit') || '50')

  let query = supabase
    .from('email_outbox')
    .select('*')
    .order('queued_at', { ascending: false })
    .limit(limit)

  if (status) query = query.eq('status', status)

  const { data, error: dbError } = await query
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  const { user, supabase, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  const body = await req.json()
  const { to, subject, body_md } = body

  if (!to || !subject || !body_md) {
    return NextResponse.json({ error: 'to, subject, body_md required' }, { status: 400 })
  }

  const toArr = Array.isArray(to) ? to : [to]

  const { data, error: dbError } = await supabase
    .from('email_outbox')
    .insert({ to: toArr, subject, body_md })
    .select()
    .single()

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  return NextResponse.json({ data }, { status: 201 })
}
