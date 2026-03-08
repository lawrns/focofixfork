import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { supabaseAdmin } from '@/lib/supabase-server'
import { TrustScoringService } from '@/lib/trust/trust-scoring-service'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const { user, error: authError, response: authResponse } = await getAuthUser(req)
  if (authError || !user) {
    return mergeAuthResponse(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), authResponse)
  }

  try {
    const db = supabaseAdmin
    if (!db) {
      return mergeAuthResponse(NextResponse.json({ error: 'Database unavailable' }, { status: 500 }), authResponse)
    }

    const body = await req.json()
    const { agent_id, workspace_id, poe_anchor_id, amount_cents, currency, stripe_event_id, description } = body

    if (!agent_id || !workspace_id || typeof amount_cents !== 'number') {
      return mergeAuthResponse(
        NextResponse.json({ error: 'agent_id, workspace_id, and amount_cents are required' }, { status: 400 }),
        authResponse,
      )
    }

    // Verify workspace access
    const { data: membership } = await db
      .from('foco_workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .eq('workspace_id', workspace_id)
      .single()

    if (!membership) {
      return mergeAuthResponse(NextResponse.json({ error: 'Forbidden' }, { status: 403 }), authResponse)
    }

    await TrustScoringService.attributeRevenue(db, {
      agentId: agent_id,
      workspaceId: workspace_id,
      poeAnchorId: poe_anchor_id,
      amountCents: amount_cents,
      currency,
      stripeEventId: stripe_event_id,
      description,
    })

    return mergeAuthResponse(NextResponse.json({ ok: true }), authResponse)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return mergeAuthResponse(NextResponse.json({ error: message }, { status: 500 }), authResponse)
  }
}
