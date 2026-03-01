import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { authRequiredResponse } from '@/lib/api/response-helpers'
import { supabaseAdmin } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { user, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  // Get the user's workspace(s)
  const { data: memberships } = await supabaseAdmin
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .limit(1)

  const workspaceId = memberships?.[0]?.workspace_id

  let query = supabaseAdmin
    .from('fleet_policies')
    .select('*')
    .order('created_at', { ascending: false })

  if (workspaceId) {
    query = query.or(`workspace_id.eq.${workspaceId},workspace_id.is.null`)
  }

  const { data, error: dbError } = await query
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  return NextResponse.json({ data: data ?? [] })
}

export async function POST(req: NextRequest) {
  const { user, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  const body = await req.json()
  const { name, scope, trigger_condition, action } = body

  if (!name || !trigger_condition || !action) {
    return NextResponse.json({ error: 'name, trigger_condition, and action are required' }, { status: 400 })
  }

  // Get the user's workspace
  const { data: memberships } = await supabaseAdmin
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .limit(1)

  const workspaceId = memberships?.[0]?.workspace_id ?? null

  const { data, error: dbError } = await supabaseAdmin
    .from('fleet_policies')
    .insert({
      name,
      scope: scope ?? 'global',
      trigger_condition,
      action,
      created_by: user.id,
      workspace_id: workspaceId,
    })
    .select()
    .single()

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  return NextResponse.json({ data }, { status: 201 })
}
