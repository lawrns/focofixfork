import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import {
  successResponse,
  authRequiredResponse,
  badRequestResponse,
  notFoundResponse,
  internalErrorResponse,
} from '@/lib/api/response-helpers'
import { supabaseAdmin } from '@/lib/supabase-server'
import { dispatchPipelinePhase } from '@/lib/pipeline/dispatcher'
import { buildExecuteContext } from '@/lib/pipeline/context-builder'
import type { PlanResult } from '@/lib/pipeline/types'
import { pickPreferredModel, resolveClawdRoutingProfile } from '@/lib/clawdbot/routing'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  let authResponse: NextResponse | undefined
  try {
    const { user, error, response } = await getAuthUser(req)
    authResponse = response

    if (error || !user) {
      return mergeAuthResponse(authRequiredResponse(), authResponse)
    }

    const body = await req.json()
    const { run_id, executor_model: requested_executor_model = null } = body

    if (!run_id) {
      return mergeAuthResponse(badRequestResponse('run_id is required'), authResponse)
    }

    if (!supabaseAdmin) {
      return mergeAuthResponse(internalErrorResponse('DB not available'), authResponse)
    }

    // Fetch and verify ownership
    const { data: run, error: fetchError } = await supabaseAdmin
      .from('pipeline_runs')
      .select('*')
      .eq('id', run_id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !run) {
      return mergeAuthResponse(notFoundResponse('pipeline_run', run_id), authResponse)
    }

    if (!run.plan_result) {
      return mergeAuthResponse(
        badRequestResponse('Planning phase must complete before execution'),
        authResponse
      )
    }

    const context = buildExecuteContext(
      run.task_description,
      run.plan_result as PlanResult
    )
    const routing = await resolveClawdRoutingProfile(run.routing_profile_id ?? null)
    const executor_model = pickPreferredModel(routing, 'execute', requested_executor_model)

    let executorRunId: string | null = null
    try {
      executorRunId = await dispatchPipelinePhase({
        pipelineRunId: run.id,
        phase: 'execute',
        preferredModel: executor_model,
        taskDescription: run.task_description,
        context,
      })
    } catch (dispatchErr) {
      console.error('[Pipeline:execute] dispatch error:', dispatchErr)
    }

    await supabaseAdmin
      .from('pipeline_runs')
      .update({
        executor_run_id: executorRunId,
        executor_model,
        routing_profile_id: run.routing_profile_id ?? routing.profile_id,
        status: 'executing',
      })
      .eq('id', run.id)

    return mergeAuthResponse(
      successResponse({ run_id: run.id, executor_run_id: executorRunId }),
      authResponse
    )
  } catch (err) {
    return mergeAuthResponse(
      internalErrorResponse('Unexpected error', err instanceof Error ? err.message : err),
      authResponse
    )
  }
}
