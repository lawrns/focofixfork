import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { supabaseAdmin } from '@/lib/supabase-server'
import { TrustScoringService } from '@/lib/trust/trust-scoring-service'

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

    const score = await TrustScoringService.getOrCreateScore(db, agentId, agent.workspace_id)
    return mergeAuthResponse(NextResponse.json({ score }), authResponse)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return mergeAuthResponse(NextResponse.json({ error: message }, { status: 500 }), authResponse)
  }
}

export async function POST(
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

    const { data: agent } = await db.from('agents').select('workspace_id').eq('id', agentId).single()
    if (!agent) {
      return mergeAuthResponse(NextResponse.json({ error: 'Agent not found' }, { status: 404 }), authResponse)
    }

    const { data: membership } = await db
      .from('foco_workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .eq('workspace_id', agent.workspace_id)
      .single()

    if (!membership) {
      return mergeAuthResponse(NextResponse.json({ error: 'Forbidden' }, { status: 403 }), authResponse)
    }

    const score = await TrustScoringService.recalculateScore(db, agentId, agent.workspace_id)
    return mergeAuthResponse(NextResponse.json({ score }), authResponse)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return mergeAuthResponse(NextResponse.json({ error: message }, { status: 500 }), authResponse)
  }
}
