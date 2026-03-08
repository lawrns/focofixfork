import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { authRequiredResponse, successResponse, missingFieldResponse, databaseErrorResponse } from '@/lib/api/response-helpers'
import { reconcileAutonomySession } from '@/lib/autonomy/session-jobs'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  let authResponse: NextResponse | undefined
  try {
    const { user, supabase, error: authError, response } = await getAuthUser(req)
    authResponse = response
    if (authError || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

    const body = await req.json().catch(() => ({} as Record<string, unknown>))
    const sessionId = typeof body.sessionId === 'string' ? body.sessionId : ''
    const reason = typeof body.reason === 'string' ? body.reason : 'Manual stop'

    if (!sessionId) {
      return mergeAuthResponse(missingFieldResponse('sessionId'), authResponse)
    }

    const now = new Date().toISOString()
    const { data: sessionRow, error: sessionError } = await supabase
      .from('autonomy_sessions')
      .update({
        status: 'cancelled',
        window_end: now,
      })
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .select('id, run_id, status, window_end')
      .single()

    if (sessionError) {
      return mergeAuthResponse(databaseErrorResponse('Failed to stop autonomy session', sessionError), authResponse)
    }

    await supabase
      .from('autonomy_session_jobs')
      .update({
        status: 'cancelled',
        error: reason,
      })
      .eq('session_id', sessionId)
      .in('status', ['queued', 'running'])

    if (sessionRow.run_id) {
      await supabase
        .from('runs')
        .update({
          status: 'cancelled',
          ended_at: now,
          updated_at: now,
        })
        .eq('id', sessionRow.run_id)
    }

    await reconcileAutonomySession(supabase, sessionId)

    await supabase.from('ledger_events').insert({
      type: 'autonomy_session_stopped',
      source: 'cofounder',
      context_id: sessionId,
      payload: { run_id: sessionRow.run_id, reason },
      timestamp: now,
    })

    return mergeAuthResponse(successResponse({
      sessionId: sessionRow.id,
      runId: sessionRow.run_id,
      status: sessionRow.status,
      endedAt: sessionRow.window_end,
      reason,
    }), authResponse)
  } catch (error: unknown) {
    return mergeAuthResponse(databaseErrorResponse('Failed to stop autonomy session', error), authResponse)
  }
}
