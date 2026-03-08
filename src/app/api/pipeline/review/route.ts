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
import { buildReviewContext } from '@/lib/pipeline/context-builder'
import { listHandbooks } from '@/lib/handbook/handbook-loader'
import type { PlanResult, ExecutionResult } from '@/lib/pipeline/types'
import { resolveAIExecutionProfileFromWorkspace } from '@/lib/ai/resolver'
import { dispatchOrFallbackPhase, parseReviewResult } from '@/lib/pipeline/runtime'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  let authResponse: NextResponse | undefined
  try {
    const { user, supabase, error, response } = await getAuthUser(req)
    authResponse = response

    if (error || !user) {
      return mergeAuthResponse(authRequiredResponse(), authResponse)
    }

    const body = await req.json()
    const { run_id, reviewer_model: requested_reviewer_model = null, reviewer_fallback_chain: requested_reviewer_fallback_chain = null, handbook_slug } = body

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

    const { profile } = await resolveAIExecutionProfileFromWorkspace({
      supabase,
      userId: user.id,
      workspaceId: run.workspace_id ?? null,
      useCase: 'pipeline_review',
      requestedModel: requested_reviewer_model,
      requestedFallbackChain: Array.isArray(requested_reviewer_fallback_chain) ? requested_reviewer_fallback_chain : undefined,
    })
    const reviewer_model = profile.model

    const migrationFiles = await listHandbooks()

    const context = buildReviewContext(
      run.task_description,
      run.plan_result as PlanResult,
      run.execution_result as ExecutionResult,
      migrationFiles
    )

    const phase = await dispatchOrFallbackPhase({
      pipelineRunId: run.id,
      phase: 'review',
      requestedModel: requested_reviewer_model ?? reviewer_model,
      resolvedModel: reviewer_model,
      fallbackChain: profile.fallback_chain,
      taskDescription: run.task_description,
      context,
    })

    if (!phase.ok) {
      await supabaseAdmin.from('pipeline_runs').update({ status: 'failed' }).eq('id', run.id)
      return mergeAuthResponse(internalErrorResponse('Failed to start review phase', phase.error), authResponse)
    }

    const updates: Record<string, unknown> = {
      reviewer_run_id: phase.externalRunId ?? null,
      reviewer_model,
      routing_profile_id: profile.routing_profile_id ?? run.routing_profile_id,
      provider_chain: profile.fallback_chain,
      status: phase.externalRunId ? 'reviewing' : 'complete',
      ...(handbook_slug ? { handbook_ref: handbook_slug } : {}),
      fallbacks_triggered: phase.fallbackEvents,
      review_model_actual: phase.actualModel,
      reviewer_elapsed_ms: phase.elapsedMs,
    }

    if (phase.output) {
      updates.review_result = parseReviewResult(phase.output)
    }

    await supabaseAdmin
      .from('pipeline_runs')
      .update(updates)
      .eq('id', run.id)

    return mergeAuthResponse(
      successResponse({ run_id: run.id, reviewer_run_id: phase.externalRunId ?? null, runner: phase.runner, actual_model: phase.actualModel, fallback_events: phase.fallbackEvents }),
      authResponse
    )
  } catch (err) {
    return mergeAuthResponse(
      internalErrorResponse('Unexpected error', err instanceof Error ? err.message : err),
      authResponse
    )
  }
}
