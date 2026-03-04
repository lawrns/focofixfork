import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { authRequiredResponse, successResponse, databaseErrorResponse } from '@/lib/api/response-helpers'

export const dynamic = 'force-dynamic'

interface SessionRow {
  id: string
  run_id: string | null
  objective: string | null
  mode: string
  profile: string
  status: string
  window_start: string
  window_end: string | null
  created_at: string
}

interface DecisionRow {
  id: string
  intent: string
  authority_level: string
  created_at: string
}

interface ActionLogRow {
  id: string
  action_type: string
  domain: string
  input: Record<string, unknown> | null
  decision: Record<string, unknown> | null
  allowed: boolean
  requires_approval: boolean
  created_at: string
}

export async function GET(req: NextRequest) {
  let authResponse: NextResponse | undefined
  try {
    const { user, supabase, error: authError, response } = await getAuthUser(req)
    authResponse = response
    if (authError || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

    const { searchParams } = new URL(req.url)
    const sinceHours = Math.max(1, Math.min(72, parseInt(searchParams.get('sinceHours') ?? '12', 10)))
    const sinceDate = new Date(Date.now() - (sinceHours * 60 * 60 * 1000)).toISOString()

    const { data: sessions, error: sessionsError } = await supabase
      .from('autonomy_sessions')
      .select('id, run_id, objective, mode, profile, status, window_start, window_end, created_at')
      .eq('user_id', user.id)
      .gte('window_start', sinceDate)
      .order('window_start', { ascending: false })

    if (sessionsError) {
      return mergeAuthResponse(databaseErrorResponse('Failed to fetch autonomy sessions', sessionsError), authResponse)
    }

    const { data: decisions, error: decisionsError } = await supabase
      .from('crico_actions')
      .select('id, intent, authority_level, created_at')
      .eq('requires_approval', true)
      .eq('status', 'pending')
      .gte('created_at', sinceDate)
      .order('created_at', { ascending: false })
      .limit(20)

    if (decisionsError) {
      return mergeAuthResponse(databaseErrorResponse('Failed to fetch pending decisions', decisionsError), authResponse)
    }

    const { data: actionLogs, error: actionLogsError } = await supabase
      .from('autonomy_action_logs')
      .select('id, action_type, domain, input, decision, allowed, requires_approval, created_at')
      .eq('user_id', user.id)
      .gte('created_at', sinceDate)
      .order('created_at', { ascending: false })

    if (actionLogsError) {
      return mergeAuthResponse(databaseErrorResponse('Failed to fetch autonomy action logs', actionLogsError), authResponse)
    }

    const typedActionLogs = (actionLogs ?? []) as ActionLogRow[]
    const executedActions = typedActionLogs.filter((event) => event.allowed === true).length
    const blockedActions = typedActionLogs.filter((event) => event.allowed === false).length

    return mergeAuthResponse(successResponse({
      generatedAt: new Date().toISOString(),
      windowHours: sinceHours,
      summary: {
        sessions: (sessions ?? []).length,
        executedActions,
        blockedActions,
        pendingDecisions: (decisions ?? []).length,
      },
      sessions: (sessions ?? []) as SessionRow[],
      decisions: (decisions ?? []) as DecisionRow[],
      validations: typedActionLogs.slice(0, 50),
    }), authResponse)
  } catch (error: unknown) {
    return mergeAuthResponse(databaseErrorResponse('Failed to generate morning report', error), authResponse)
  }
}
