import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { authRequiredResponse, successResponse, validationFailedResponse, databaseErrorResponse } from '@/lib/api/response-helpers'
import { getUserCoFounderPolicy } from '@/lib/autonomy/settings'
import { isInOvernightWindow } from '@/lib/autonomy/policy'

export const dynamic = 'force-dynamic'

function buildSessionSummary(objective?: string): string {
  if (!objective || objective.trim().length === 0) {
    return 'Autonomous co-founder session'
  }
  return `Autonomous co-founder session: ${objective.trim().slice(0, 180)}`
}

function parseWorkspaceId(body: Record<string, unknown>): string | null {
  return typeof body.workspace_id === 'string' && body.workspace_id.length > 0
    ? body.workspace_id
    : null
}

export async function POST(req: NextRequest) {
  let authResponse: NextResponse | undefined
  try {
    const { user, supabase, error: authError, response } = await getAuthUser(req)
    authResponse = response
    if (authError || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

    const body = await req.json().catch(() => ({} as Record<string, unknown>))
    const objective = typeof body.objective === 'string' ? body.objective : undefined
    const workspaceId = parseWorkspaceId(body)

    const policy = await getUserCoFounderPolicy(supabase, user.id, workspaceId)
    if (policy.mode === 'off') {
      return mergeAuthResponse(validationFailedResponse('Co-founder autonomy is disabled in settings'), authResponse)
    }

    if (!isInOvernightWindow(policy)) {
      return mergeAuthResponse(validationFailedResponse('Current time is outside the configured overnight window'), authResponse)
    }

    const now = new Date().toISOString()
    const { data: runRow, error: runError } = await supabase
      .from('runs')
      .insert({
        runner: 'cofounder_session',
        status: 'running',
        summary: buildSessionSummary(objective),
        started_at: now,
      })
      .select('id, runner, status, summary, started_at, created_at')
      .single()

    if (runError) {
      return mergeAuthResponse(databaseErrorResponse('Failed to start autonomy session', runError), authResponse)
    }

    const { data: sessionRow, error: sessionError } = await supabase
      .from('autonomy_sessions')
      .insert({
        user_id: user.id,
        run_id: runRow.id,
        workspace_id: workspaceId,
        objective: objective ?? null,
        mode: policy.mode,
        profile: policy.profile,
        status: 'running',
        timezone: policy.overnightWindow.timezone,
        window_start: now,
        config_snapshot: policy as unknown as Record<string, unknown>,
      })
      .select('id, status, window_start')
      .single()

    if (sessionError) {
      return mergeAuthResponse(databaseErrorResponse('Failed to create autonomy session', sessionError), authResponse)
    }

    await supabase.from('ledger_events').insert({
      type: 'autonomy_session_started',
      source: 'cofounder',
      context_id: sessionRow.id,
      payload: {
        session_id: sessionRow.id,
        run_id: runRow.id,
        objective: objective ?? null,
        mode: policy.mode,
        profile: policy.profile,
        hardLimits: policy.hardLimits,
        overnightWindow: policy.overnightWindow,
      },
      timestamp: now,
    })

    return mergeAuthResponse(successResponse({
      sessionId: sessionRow.id,
      runId: runRow.id,
      status: sessionRow.status,
      startedAt: sessionRow.window_start,
      objective: objective ?? null,
      policy,
    }), authResponse)
  } catch (error: unknown) {
    return mergeAuthResponse(databaseErrorResponse('Failed to start autonomy session', error), authResponse)
  }
}
