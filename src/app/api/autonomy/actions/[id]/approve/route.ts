import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { authRequiredResponse, successResponse, validationFailedResponse, databaseErrorResponse } from '@/lib/api/response-helpers'
import { supabaseAdmin } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let authResponse: NextResponse | undefined
  try {
    const { id } = await params
    const { user, supabase, error: authError, response } = await getAuthUser(req)
    authResponse = response
    if (authError || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

    const body = await req.json().catch(() => ({} as Record<string, unknown>))
    const decision = body.decision === 'reject' ? 'reject' : 'approve'
    const note = typeof body.note === 'string' ? body.note.trim() : ''
    const sessionId = typeof body.sessionId === 'string' ? body.sessionId : null

    const client = supabaseAdmin || supabase
    const { data: current, error: fetchError } = await client
      .from('crico_actions')
      .select('id, status, metadata')
      .eq('id', id)
      .maybeSingle()

    if (fetchError) {
      return mergeAuthResponse(databaseErrorResponse('Failed to fetch action for approval', fetchError), authResponse)
    }
    if (!current) {
      return mergeAuthResponse(validationFailedResponse('Action not found for approval'), authResponse)
    }

    const metadata = (current.metadata ?? {}) as Record<string, unknown>
    const now = new Date().toISOString()
    const updates: Record<string, unknown> = {
      status: decision === 'approve' ? 'approved' : 'cancelled',
      metadata: {
        ...metadata,
        cofounder_decision: decision,
        cofounder_note: note || null,
        cofounder_actor: user.id,
        cofounder_decided_at: now,
      },
    }

    if (decision === 'approve') {
      updates.approved_at = now
    }

    const { error: updateError } = await client
      .from('crico_actions')
      .update(updates)
      .eq('id', id)

    if (updateError) {
      return mergeAuthResponse(databaseErrorResponse('Failed to apply autonomy approval', updateError), authResponse)
    }

    await supabase.from('autonomy_action_logs').insert({
      session_id: sessionId,
      user_id: user.id,
      action_type: 'manual_override',
      domain: 'governance',
      input: { action_id: id, note: note || null },
      decision: { decision },
      allowed: decision === 'approve',
      requires_approval: false,
    })

    await supabase.from('ledger_events').insert({
      type: 'autonomy_action_override',
      source: 'cofounder',
      context_id: sessionId ?? id,
      payload: {
        session_id: sessionId,
        action_id: id,
        decision,
        note: note || null,
      },
      timestamp: now,
    })

    return mergeAuthResponse(successResponse({
      id,
      decision,
      decidedAt: now,
    }), authResponse)
  } catch (error: unknown) {
    return mergeAuthResponse(databaseErrorResponse('Failed to approve autonomy action', error), authResponse)
  }
}
