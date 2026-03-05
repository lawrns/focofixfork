import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { authRequiredResponse } from '@/lib/api/response-helpers'
import { supabaseAdmin } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

async function userWorkspaceIds(userId: string): Promise<string[]> {
  if (!supabaseAdmin) return []
  const { data } = await supabaseAdmin
    .from('foco_workspace_members')
    .select('workspace_id')
    .eq('user_id', userId)
  return (data ?? []).map((row: { workspace_id: string }) => row.workspace_id)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)
  if (!supabaseAdmin) return NextResponse.json({ error: 'DB not available' }, { status: 500 })

  const body = await req.json()
  const update: Record<string, unknown> = {}
  if (typeof body?.name === 'string') update.name = body.name.trim()
  if (typeof body?.scope === 'string') update.scope = body.scope
  if (typeof body?.trigger_condition === 'string') update.trigger_condition = body.trigger_condition
  if (typeof body?.action === 'string') update.action = body.action
  if (typeof body?.enabled === 'boolean') update.enabled = body.enabled

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No update fields provided' }, { status: 400 })
  }

  const workspaceIds = await userWorkspaceIds(user.id)
  if (workspaceIds.length === 0) {
    return NextResponse.json({ error: 'No workspace membership found' }, { status: 403 })
  }

  let { data, error: dbError } = await supabaseAdmin
    .from('fleet_policies')
    .update(update)
    .eq('id', params.id)
    .in('workspace_id', workspaceIds)
    .select('*')
    .single()

  if (dbError || !data) {
    const retry = await supabaseAdmin
      .from('fleet_policies')
      .update(update)
      .eq('id', params.id)
      .is('workspace_id', null)
      .eq('created_by', user.id)
      .select('*')
      .single()
    data = retry.data
    dbError = retry.error
  }

  if (dbError || !data) return NextResponse.json({ error: 'Policy not found' }, { status: 404 })
  return NextResponse.json({ data })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)
  if (!supabaseAdmin) return NextResponse.json({ error: 'DB not available' }, { status: 500 })

  const workspaceIds = await userWorkspaceIds(user.id)
  if (workspaceIds.length === 0) {
    return NextResponse.json({ error: 'No workspace membership found' }, { status: 403 })
  }

  let { data, error: dbError } = await supabaseAdmin
    .from('fleet_policies')
    .delete()
    .eq('id', params.id)
    .in('workspace_id', workspaceIds)
    .select('id')
    .single()

  if (dbError || !data) {
    const retry = await supabaseAdmin
      .from('fleet_policies')
      .delete()
      .eq('id', params.id)
      .is('workspace_id', null)
      .eq('created_by', user.id)
      .select('id')
      .single()
    data = retry.data
    dbError = retry.error
  }

  if (dbError || !data) return NextResponse.json({ error: 'Policy not found' }, { status: 404 })
  return NextResponse.json({ deleted: true, id: params.id })
}
