import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { supabaseAdmin } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { user, error: authError, response: authResponse } = await getAuthUser(req)
  if (authError || !user) {
    return mergeAuthResponse(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), authResponse)
  }

  try {
    const db = supabaseAdmin
    if (!db) {
      return mergeAuthResponse(NextResponse.json({ error: 'Database unavailable' }, { status: 500 }), authResponse)
    }

    const workspaceId = req.nextUrl.searchParams.get('workspace_id')

    // Get workspace IDs the user has access to
    const { data: memberships } = await db
      .from('foco_workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)

    const workspaceIds = (memberships ?? []).map((m: { workspace_id: string }) => m.workspace_id)
    if (workspaceIds.length === 0) {
      return mergeAuthResponse(NextResponse.json({ agents: [], scores: [] }), authResponse)
    }

    const targetWorkspaces = workspaceId ? [workspaceId].filter((id) => workspaceIds.includes(id)) : workspaceIds
    if (targetWorkspaces.length === 0) {
      return mergeAuthResponse(NextResponse.json({ error: 'Workspace not found' }, { status: 404 }), authResponse)
    }

    // Fetch agents with trust scores
    const { data: agents, error: agentsError } = await db
      .from('agents')
      .select('*, agent_trust_scores(*)')
      .in('workspace_id', targetWorkspaces)
      .order('created_at', { ascending: false })

    if (agentsError) {
      return mergeAuthResponse(
        NextResponse.json({ error: agentsError.message }, { status: 500 }),
        authResponse,
      )
    }

    return mergeAuthResponse(NextResponse.json({ agents: agents ?? [] }), authResponse)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return mergeAuthResponse(NextResponse.json({ error: message }, { status: 500 }), authResponse)
  }
}
