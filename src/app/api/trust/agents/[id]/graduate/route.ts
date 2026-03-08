import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { supabaseAdmin } from '@/lib/supabase-server'
import { TrustScoringService } from '@/lib/trust/trust-scoring-service'
import type { AutonomyTier } from '@/lib/trust/types'

export const dynamic = 'force-dynamic'

const VALID_TIERS: AutonomyTier[] = ['off', 'advisor', 'bounded', 'near_full']

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
    const body = await req.json()
    const newTier = body.new_tier as AutonomyTier
    const reason = body.reason as string

    if (!newTier || !VALID_TIERS.includes(newTier)) {
      return mergeAuthResponse(
        NextResponse.json({ error: `Invalid tier. Must be one of: ${VALID_TIERS.join(', ')}` }, { status: 400 }),
        authResponse,
      )
    }

    if (!reason || typeof reason !== 'string') {
      return mergeAuthResponse(
        NextResponse.json({ error: 'reason is required' }, { status: 400 }),
        authResponse,
      )
    }

    // Verify workspace access
    const { data: agent } = await db.from('agents').select('*').eq('id', agentId).single()
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

    const score = await TrustScoringService.getOrCreateScore(db, agentId, agent.workspace_id)

    const logEntry = await TrustScoringService.graduateAgent(db, {
      agentId,
      workspaceId: agent.workspace_id,
      previousTier: agent.autonomy_tier,
      newTier,
      reason: `Manual: ${reason}`,
      scoreAtChange: score.score,
      triggeredBy: user.id,
    })

    return mergeAuthResponse(NextResponse.json({ graduation: logEntry }), authResponse)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return mergeAuthResponse(NextResponse.json({ error: message }, { status: 500 }), authResponse)
  }
}
