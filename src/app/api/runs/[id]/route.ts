import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { authRequiredResponse } from '@/lib/api/response-helpers'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, supabase, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  const { data, error: dbError } = await supabase
    .from('runs')
    .select('*, run_steps(*)')
    .eq('id', params.id)
    .single()

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 404 })

  return NextResponse.json({ data })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, supabase, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  const { status, policy_decision } = await req.json()

  const { data, error: dbError } = await supabase
    .from('runs')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', params.id)
    .select()
    .single()

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  if (policy_decision) {
    await supabase.from('ledger_events').insert({
      type: 'policy.decision',
      source: 'policy-engine',
      context_id: params.id,
      payload: { run_id: params.id, decision: policy_decision, status },
    })
  }

  return NextResponse.json({ data })
}
