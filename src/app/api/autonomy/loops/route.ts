import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import {
  authRequiredResponse,
  successResponse,
  validationFailedResponse,
  databaseErrorResponse,
} from '@/lib/api/response-helpers'
import { getUserCoFounderPolicy } from '@/lib/autonomy/settings'
import { createLoop } from '@/lib/autonomy/loops'
import { ensureLoopTickerCron } from '@/lib/autonomy/loop-cron'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  let authResponse: NextResponse | undefined
  try {
    const { user, supabase, error: authError, response } = await getAuthUser(req)
    authResponse = response
    if (authError || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

    const { searchParams } = new URL(req.url)
    const workspaceId = searchParams.get('workspace_id')
    const status = searchParams.get('status')
    const limit = Math.max(1, Math.min(200, parseInt(searchParams.get('limit') ?? '50', 10)))

    let query = supabase
      .from('cofounder_loops')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (workspaceId) query = query.eq('workspace_id', workspaceId)
    if (status) query = query.eq('status', status)

    const { data, error, count } = await query
    if (error) {
      return mergeAuthResponse(databaseErrorResponse('Failed to fetch loops', error), authResponse)
    }

    return mergeAuthResponse(successResponse({ data: data ?? [], count: count ?? 0 }), authResponse)
  } catch (error: unknown) {
    return mergeAuthResponse(databaseErrorResponse('Failed to fetch loops', error), authResponse)
  }
}

export async function POST(req: NextRequest) {
  let authResponse: NextResponse | undefined
  try {
    const { user, supabase, error: authError, response } = await getAuthUser(req)
    authResponse = response
    if (authError || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

    const body = await req.json().catch(() => ({} as Record<string, unknown>))

    // Validate required fields
    const { loop_type, schedule_kind, schedule_value, timezone } = body as Record<string, unknown>
    if (!loop_type || typeof loop_type !== 'string') {
      return mergeAuthResponse(validationFailedResponse('loop_type is required'), authResponse)
    }
    if (!schedule_kind || typeof schedule_kind !== 'string') {
      return mergeAuthResponse(validationFailedResponse('schedule_kind is required'), authResponse)
    }
    if (!schedule_value || typeof schedule_value !== 'string') {
      return mergeAuthResponse(validationFailedResponse('schedule_value is required'), authResponse)
    }
    if (!timezone || typeof timezone !== 'string') {
      return mergeAuthResponse(validationFailedResponse('timezone is required'), authResponse)
    }

    const workspaceId = typeof body.workspace_id === 'string' && body.workspace_id.length > 0
      ? body.workspace_id
      : null

    if (!workspaceId) {
      return mergeAuthResponse(validationFailedResponse('workspace_id is required'), authResponse)
    }

    const policy = await getUserCoFounderPolicy(supabase, user.id, workspaceId)
    if (policy.mode === 'off') {
      return mergeAuthResponse(
        validationFailedResponse('Co-founder autonomy is disabled in settings'),
        authResponse,
      )
    }

    const input = {
      user_id: user.id,
      workspace_id: workspaceId,
      loop_type: body.loop_type as import('@/lib/autonomy/loop-types').LoopType,
      schedule_kind: body.schedule_kind as import('@/lib/autonomy/loop-types').ScheduleKind,
      schedule_value: body.schedule_value as string,
      timezone: body.timezone as string,
      requested_execution_mode: body.requested_execution_mode as import('@/lib/autonomy/loop-types').ExecutionMode | undefined,
      execution_backend: body.execution_backend as import('@/lib/autonomy/loop-types').ExecutionBackend | undefined,
      execution_target: body.execution_target as Record<string, unknown> | undefined,
      planning_agent: body.planning_agent as Record<string, unknown> | undefined,
      selected_project_ids: Array.isArray(body.selected_project_ids) ? body.selected_project_ids as string[] : [],
      git_strategy: body.git_strategy as Record<string, unknown> | undefined,
      config: body.config as Record<string, unknown> | undefined,
      expires_at: typeof body.expires_at === 'string' ? body.expires_at : undefined,
    }

    const loop = await createLoop(supabase, user.id, input, policy as unknown as { mode: string; hardLimits?: Record<string, unknown> })

    // Idempotently ensure the per-minute ticker cron exists
    void ensureLoopTickerCron()

    return mergeAuthResponse(successResponse({ data: loop }, undefined, 201), authResponse)
  } catch (error: unknown) {
    return mergeAuthResponse(databaseErrorResponse('Failed to create loop', error), authResponse)
  }
}
