import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import {
  authRequiredResponse,
  successResponse,
  validationFailedResponse,
  databaseErrorResponse,
  notFoundResponse,
} from '@/lib/api/response-helpers'
import { cancelLoop } from '@/lib/autonomy/loops'
import { computeNextTick } from '@/lib/autonomy/loop-scheduler'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  let authResponse: NextResponse | undefined
  try {
    const { user, supabase, error: authError, response } = await getAuthUser(req)
    authResponse = response
    if (authError || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

    const { id } = params

    const { data: loop, error: loopError } = await supabase
      .from('cofounder_loops')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .single()

    if (loopError || !loop) {
      return mergeAuthResponse(notFoundResponse('Loop', id), authResponse)
    }

    const { data: iterations, error: iterError } = await supabase
      .from('autonomy_sessions')
      .select('id, status, objective, mode, profile, window_start, window_end, created_at, updated_at, summary')
      .eq('loop_id', id)
      .order('created_at', { ascending: false })
      .limit(10)

    if (iterError) {
      return mergeAuthResponse(
        databaseErrorResponse('Failed to fetch loop iterations', iterError),
        authResponse,
      )
    }

    return mergeAuthResponse(
      successResponse({ data: loop, iterations: iterations ?? [] }),
      authResponse,
    )
  } catch (error: unknown) {
    return mergeAuthResponse(databaseErrorResponse('Failed to fetch loop', error), authResponse)
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  let authResponse: NextResponse | undefined
  try {
    const { user, supabase, error: authError, response } = await getAuthUser(req)
    authResponse = response
    if (authError || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

    const { id } = params

    // Verify ownership and existence
    const { data: existing, error: fetchError } = await supabase
      .from('cofounder_loops')
      .select('id, loop_type, execution_backend, schedule_kind, schedule_value, timezone')
      .eq('id', id)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .single()

    if (fetchError || !existing) {
      return mergeAuthResponse(notFoundResponse('Loop', id), authResponse)
    }

    const body = await req.json().catch(() => ({} as Record<string, unknown>))

    // Disallow changing immutable fields
    if ('loop_type' in body) {
      return mergeAuthResponse(
        validationFailedResponse('loop_type cannot be changed after creation'),
        authResponse,
      )
    }
    if ('execution_backend' in body) {
      return mergeAuthResponse(
        validationFailedResponse('execution_backend cannot be changed after creation'),
        authResponse,
      )
    }

    // Build the patch
    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (typeof body.schedule_value === 'string') patch.schedule_value = body.schedule_value
    if (typeof body.timezone === 'string') patch.timezone = body.timezone
    if (body.config !== undefined) patch.config = body.config
    if (body.planning_agent !== undefined) patch.planning_agent = body.planning_agent
    if (body.execution_target !== undefined) patch.execution_target = body.execution_target
    if (typeof body.expires_at === 'string' || body.expires_at === null) patch.expires_at = body.expires_at
    if (Array.isArray(body.selected_project_ids)) patch.selected_project_ids = body.selected_project_ids

    // Recompute next_tick_at if schedule changed
    const scheduleChanged = 'schedule_value' in body || 'timezone' in body
    if (scheduleChanged) {
      const newScheduleValue = (patch.schedule_value as string | undefined) ?? existing.schedule_value
      const newTimezone = (patch.timezone as string | undefined) ?? existing.timezone
      const nextTick = computeNextTick(existing.schedule_kind, newScheduleValue, newTimezone)
      if (nextTick) patch.next_tick_at = nextTick.toISOString()
    }

    const { data: updated, error: updateError } = await supabase
      .from('cofounder_loops')
      .update(patch)
      .eq('id', id)
      .eq('user_id', user.id)
      .select('*')
      .single()

    if (updateError) {
      return mergeAuthResponse(databaseErrorResponse('Failed to update loop', updateError), authResponse)
    }

    return mergeAuthResponse(successResponse({ data: updated }), authResponse)
  } catch (error: unknown) {
    return mergeAuthResponse(databaseErrorResponse('Failed to update loop', error), authResponse)
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  let authResponse: NextResponse | undefined
  try {
    const { user, supabase, error: authError, response } = await getAuthUser(req)
    authResponse = response
    if (authError || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

    const { id } = params

    // Verify ownership
    const { data: existing, error: fetchError } = await supabase
      .from('cofounder_loops')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .single()

    if (fetchError || !existing) {
      return mergeAuthResponse(notFoundResponse('Loop', id), authResponse)
    }

    await cancelLoop(supabase, id, user.id)

    // Soft delete
    const { error: deleteError } = await supabase
      .from('cofounder_loops')
      .update({ deleted_at: new Date().toISOString(), status: 'cancelled' })
      .eq('id', id)
      .eq('user_id', user.id)

    if (deleteError) {
      return mergeAuthResponse(databaseErrorResponse('Failed to delete loop', deleteError), authResponse)
    }

    return mergeAuthResponse(new NextResponse(null, { status: 204 }), authResponse)
  } catch (error: unknown) {
    return mergeAuthResponse(databaseErrorResponse('Failed to delete loop', error), authResponse)
  }
}
