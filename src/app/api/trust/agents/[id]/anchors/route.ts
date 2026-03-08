import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { supabaseAdmin } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, error: authError, response: authResponse } = await getAuthUser(req)
  if (authError || !user) {
    return mergeAuthResponse(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), authResponse)
  }

  try {
    const db = supabaseAdmin
    if (!db) {
      return mergeAuthResponse(NextResponse.json({ error: 'Database unavailable' }, { status: 500 }), authResponse)
    }

    const { id: agentId } = await params
    const page = parseInt(req.nextUrl.searchParams.get('page') ?? '1', 10)
    const perPage = Math.min(parseInt(req.nextUrl.searchParams.get('per_page') ?? '20', 10), 100)
    const offset = (page - 1) * perPage

    // Verify workspace access
    const { data: agent } = await db.from('agents').select('workspace_id, public_profile').eq('id', agentId).single()
    if (!agent) {
      return mergeAuthResponse(NextResponse.json({ error: 'Agent not found' }, { status: 404 }), authResponse)
    }

    if (!agent.public_profile) {
      const { data: membership } = await db
        .from('foco_workspace_members')
        .select('workspace_id')
        .eq('user_id', user.id)
        .eq('workspace_id', agent.workspace_id)
        .single()

      if (!membership) {
        return mergeAuthResponse(NextResponse.json({ error: 'Forbidden' }, { status: 403 }), authResponse)
      }
    }

    const { data: anchors, count, error: queryError } = await db
      .from('agent_poe_anchors')
      .select('*', { count: 'exact' })
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })
      .range(offset, offset + perPage - 1)

    if (queryError) {
      return mergeAuthResponse(NextResponse.json({ error: queryError.message }, { status: 500 }), authResponse)
    }

    return mergeAuthResponse(
      NextResponse.json({ anchors: anchors ?? [], total: count ?? 0, page, per_page: perPage }),
      authResponse,
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return mergeAuthResponse(NextResponse.json({ error: message }, { status: 500 }), authResponse)
  }
}
