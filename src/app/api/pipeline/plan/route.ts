import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { successResponse, authRequiredResponse, badRequestResponse, internalErrorResponse } from '@/lib/api/response-helpers'
import { supabaseAdmin } from '@/lib/supabase-server'
import { buildPlanContext } from '@/lib/pipeline/context-builder'
import { resolveAIExecutionProfileFromWorkspace } from '@/lib/ai/resolver'
import { dispatchOrFallbackPhase, parsePlanResult } from '@/lib/pipeline/runtime'

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
    const {
      task_description,
      planner_model: requested_planner_model = null,
      planner_fallback_chain: requested_planner_fallback_chain = null,
      workspace_id,
      selected_agents,
      context: requestContext,
      planning_goal,
      constraints,
      limits,
    } = body

    if (!task_description?.trim()) {
      return mergeAuthResponse(badRequestResponse('task_description is required'), authResponse)
    }

    if (!supabaseAdmin) {
      return mergeAuthResponse(internalErrorResponse('DB not available'), authResponse)
    }

    const { profile } = await resolveAIExecutionProfileFromWorkspace({
      supabase,
      userId: user.id,
      workspaceId: workspace_id ?? null,
      useCase: 'pipeline_plan',
      requestedModel: requested_planner_model,
      requestedFallbackChain: Array.isArray(requested_planner_fallback_chain) ? requested_planner_fallback_chain : undefined,
    })
    const planner_model = profile.model

    // Create pipeline_runs row
    const { data: run, error: insertError } = await supabaseAdmin
      .from('pipeline_runs')
      .insert({
        user_id: user.id,
        workspace_id: workspace_id ?? null,
        task_description: task_description.trim(),
        planner_model,
        routing_profile_id: profile.routing_profile_id,
        provider_chain: profile.fallback_chain,
        status: 'planning',
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (insertError || !run) {
      return mergeAuthResponse(internalErrorResponse('Failed to create pipeline run', insertError), authResponse)
    }

    // Build context and dispatch to ClawdBot
    const planContext = buildPlanContext(task_description, {
      selected_agents,
      context: requestContext,
      planning_goal,
      constraints,
      limits,
    })

    const phase = await dispatchOrFallbackPhase({
      pipelineRunId: run.id,
      phase: 'plan',
      requestedModel: requested_planner_model ?? planner_model,
      resolvedModel: planner_model,
      fallbackChain: profile.fallback_chain,
      taskDescription: task_description,
      context: planContext,
    })

    if (!phase.ok) {
      await supabaseAdmin.from('pipeline_runs').update({ status: 'failed' }).eq('id', run.id)
      return mergeAuthResponse(internalErrorResponse('Failed to start planning phase', phase.error), authResponse)
    }

    if (phase.externalRunId) {
      await supabaseAdmin
        .from('pipeline_runs')
        .update({ planner_run_id: phase.externalRunId })
        .eq('id', run.id)
    } else if (phase.output) {
      const planResult = parsePlanResult(phase.output)
      await supabaseAdmin
        .from('pipeline_runs')
        .update({
          plan_result: planResult,
          status: 'executing',
          planner_elapsed_ms: phase.elapsedMs,
          plan_model_actual: phase.actualModel,
          fallbacks_triggered: phase.fallbackEvents,
        })
        .eq('id', run.id)
    }

    return mergeAuthResponse(
      successResponse({ run_id: run.id, planner_run_id: phase.externalRunId ?? null, runner: phase.runner, actual_model: phase.actualModel, fallback_events: phase.fallbackEvents }),
      authResponse
    )
  } catch (err) {
    return mergeAuthResponse(
      internalErrorResponse('Unexpected error', err instanceof Error ? err.message : err),
      authResponse
    )
  }
}
