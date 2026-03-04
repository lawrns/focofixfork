import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { supabaseAdmin } from '@/lib/supabase-server'
import type { CommandDecision, DecisionSeverity } from '@/lib/command-center/types'
import { sendTelegramAlert } from '@/lib/services/telegram'

export const dynamic = 'force-dynamic'

interface CricoAction {
  id: string
  intent: string
  source: string
  scope: string
  authority_level: string
  risk_score: number
  requires_approval: boolean
  status: string
  created_at: string
  metadata?: Record<string, unknown>
}

function mapAuthorityToPriority(authority: string): DecisionSeverity {
  switch (authority) {
    case 'destructive': return 'P0'
    case 'structural': return 'P1'
    case 'write': return 'P2'
    case 'read': return 'P3'
    default: return 'P2'
  }
}

function mapSourceToSystem(source: string, scope: string): string {
  const sourceMap: Record<string, string> = {
    'agent': 'OpenClaw',
    'api': 'Critter',
    'ide': 'Critter',
    'voice': 'Voice Control',
    'ui': 'Dashboard',
    'scheduled': 'Scheduler',
  }
  return sourceMap[source] || 'System'
}

function mapCricoActionToDecision(action: CricoAction): CommandDecision {
  const severity = mapAuthorityToPriority(action.authority_level)
  const system = mapSourceToSystem(action.source, action.scope)

  const riskLevel = action.risk_score > 0.7 ? 'Critical' : action.risk_score > 0.4 ? 'Elevated' : 'Normal'
  const actionHint = `${action.scope} • ${riskLevel} risk`

  return {
    id: action.id,
    title: action.intent,
    system,
    severity,
    actionHint,
    createdAt: action.created_at,
    state: 'needs_you',
    deferCount: (action.metadata?.defer_count as number) ?? 0,
    raw: {
      id: action.id,
      intent: action.intent,
      source: action.source,
      scope: action.scope,
      authority_level: action.authority_level,
      risk_score: action.risk_score,
      requires_approval: action.requires_approval,
      status: action.status,
      created_at: action.created_at,
      metadata: action.metadata,
    },
  }
}

export async function GET(req: NextRequest) {
  const { user, error: authError, response: authResponse } = await getAuthUser(req)
  if (authError || !user) {
    return mergeAuthResponse(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), authResponse)
  }
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Admin client not available', decisions: [] },
        { status: 500 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from('crico_actions')
      .select('*')
      .eq('requires_approval', true)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      console.warn('CRICO decisions query failed (table may not exist):', error.message)
      return NextResponse.json({ decisions: [], timestamp: new Date().toISOString() })
    }

    const actions = (data as CricoAction[] | null) || []
    const decisions = actions.map(mapCricoActionToDecision)

    // Alert on new P0/P1 decisions not yet alerted via Telegram
    for (const action of actions) {
      const severity = mapAuthorityToPriority(action.authority_level)
      if ((severity === 'P0' || severity === 'P1') && !action.metadata?.telegram_alerted) {
        sendTelegramAlert(
          `\u26A1 New ${severity} Decision: ${action.intent}`,
          { severity }
        ).catch(() => {})
        // Mark as alerted (fire-and-forget)
        supabaseAdmin
          .from('crico_actions')
          .update({ metadata: { ...(action.metadata || {}), telegram_alerted: true } })
          .eq('id', action.id)
          .then(() => {})
          .catch(() => {})
      }
    }

    return NextResponse.json({
      decisions,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Unexpected error in decisions route:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error', decisions: [] },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  const { user, error: authError, response: authResponse } = await getAuthUser(req)
  if (authError || !user) {
    return mergeAuthResponse(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), authResponse)
  }
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Admin client not available', ok: false },
        { status: 500 }
      )
    }

    const body = await req.json()
    const { id, action } = body

    if (!id || !action) {
      return NextResponse.json(
        { error: 'Missing id or action', ok: false },
        { status: 400 }
      )
    }

    if (!['approve', 'reject', 'defer'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action', ok: false },
        { status: 400 }
      )
    }

    const updates: Record<string, unknown> = {}

    // Fetch the action's details for Telegram alerts
    const { data: actionRow } = await supabaseAdmin
      .from('crico_actions')
      .select('intent, authority_level')
      .eq('id', id)
      .single()

    if (action === 'approve') {
      updates.status = 'approved'
      updates.approved_at = new Date().toISOString()
    } else if (action === 'reject') {
      updates.status = 'cancelled'
    } else if (action === 'defer') {
      // Keep status as pending, increment defer count in metadata
      const { data: existing } = await supabaseAdmin
        .from('crico_actions')
        .select('metadata')
        .eq('id', id)
        .single()

      const metadata = (existing?.metadata as Record<string, unknown>) || {}
      const prevCount = (metadata.defer_count as number) ?? 0
      metadata.defer_count = prevCount + 1
      metadata.deferred_at = new Date().toISOString()
      updates.metadata = metadata
    }

    const { error } = await supabaseAdmin
      .from('crico_actions')
      .update(updates)
      .eq('id', id)

    if (error) {
      console.warn('CRICO action update failed (table may not exist):', error.message)
      return NextResponse.json({ ok: false, error: error.message })
    }

    // Send Telegram alert for approved P0/P1 decisions
    if (action === 'approve' && actionRow) {
      const severity = mapAuthorityToPriority(actionRow.authority_level)
      if (severity === 'P0' || severity === 'P1') {
        sendTelegramAlert(
          `\u2705 Decision Approved [${severity}]: ${actionRow.intent}`,
          { severity }
        ).catch(() => {})
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Unexpected error in POST decisions:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error', ok: false },
      { status: 500 }
    )
  }
}
