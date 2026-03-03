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
import { buildReviewContext } from '@/lib/pipeline/context-builder'
import { listHandbooks } from '@/lib/handbook/handbook-loader'
import type { PlanResult, ExecutionResult } from '@/lib/pipeline/types'
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
    const { run_id, reviewer_model: requested_reviewer_model = null, handbook_slug } = body

    if (!run_id) {
      return mergeAuthResponse(badRequestResponse('run_id is required'), authResponse)
    }

    if (!supabaseAdmin) {
      return mergeAuthResponse(internalErrorResponse('DB not available'), authResponse)
    }

    const { data: run, error: fetchError } = await supabaseAdmin
      .from('pipeline_runs')
      .select('*')
      .eq('id', run_id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !run) {
      return mergeAuthResponse(notFoundResponse('pipeline_run', run_id), authResponse)
    }

    if (!run.plan_result || !run.execution_result) {
      return mergeAuthResponse(
        badRequestResponse('Both planning and execution phases must complete before review'),
        authResponse
      )
    }

    const routing = await resolveClawdRoutingProfile(run.routing_profile_id ?? null)
    const reviewer_model = pickPreferredModel(routing, 'review', requested_reviewer_model)

    const migrationFiles = await listHandbooks()

    const context = buildReviewContext(
      run.task_description,
      run.plan_result as PlanResult,
      run.execution_result as ExecutionResult,
      migrationFiles
    )

    let reviewerRunId: string | null = null
    try {
      reviewerRunId = await dispatchPipelinePhase({
        pipelineRunId: run.id,
        phase: 'review',
        preferredModel: reviewer_model,
        taskDescription: run.task_description,
        context,
      })
    } catch (dispatchErr) {
      console.error('[Pipeline:review] dispatch error:', dispatchErr)
    }

    await supabaseAdmin
      .from('pipeline_runs')
      .update({
        reviewer_run_id: reviewerRunId,
        reviewer_model,
        routing_profile_id: run.routing_profile_id ?? routing.profile_id,
        status: 'reviewing',
        ...(handbook_slug ? { handbook_ref: handbook_slug } : {}),
      })
      .eq('id', run.id)

    return mergeAuthResponse(
      successResponse({ run_id: run.id, reviewer_run_id: reviewerRunId }),
      authResponse
    )
  } catch (err) {
    return mergeAuthResponse(
      internalErrorResponse('Unexpected error', err instanceof Error ? err.message : err),
      authResponse
    )
  }
}
