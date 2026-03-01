import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import type { CommandDecision, DecisionSeverity } from '@/lib/command-center/types'

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
    'api': 'Foco',
    'ide': 'Foco',
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
    raw: action as unknown as Record<string, unknown>,
  }
}

export async function GET(_req: NextRequest) {
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

    const decisions = (data as CricoAction[] | null || []).map(mapCricoActionToDecision)

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

    if (action === 'approve') {
      updates.status = 'approved'
      updates.approved_at = new Date().toISOString()
    } else if (action === 'reject') {
      updates.status = 'cancelled'
    } else if (action === 'defer') {
      // Keep status as pending, add deferred metadata
      const { data: existing } = await supabaseAdmin
        .from('crico_actions')
        .select('metadata')
        .eq('id', id)
        .single()

      const metadata = (existing?.metadata as Record<string, unknown>) || {}
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

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Unexpected error in POST decisions:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error', ok: false },
      { status: 500 }
    )
  }
}
