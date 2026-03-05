import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { authRequiredResponse } from '@/lib/api/response-helpers'
import { supabaseAdmin } from '@/lib/supabase-server'
import { listEmpireProjectWorkflows } from '@/lib/n8n/project-workflows'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { user, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  const status = req.nextUrl.searchParams.get('status')
  const ownerAgent = req.nextUrl.searchParams.get('owner_agent')
  const riskTier = req.nextUrl.searchParams.get('risk_tier')

  const { data: memberships } = await supabaseAdmin
    .from('foco_workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)

  const workspaceIds = (memberships ?? []).map((item: { workspace_id: string }) => item.workspace_id)
  const items = await listEmpireProjectWorkflows(workspaceIds)

  const workflows = items.filter((item) => {
    if (status && String(item.last_status ?? '') !== status) return false
    if (ownerAgent && item.owner_agent !== ownerAgent) return false
    if (riskTier && item.risk_tier !== riskTier) return false
    return true
  })

  return mergeAuthResponse(NextResponse.json({ ok: true, data: { workflows } }), authResponse)
}
