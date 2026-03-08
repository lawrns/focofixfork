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
import { buildExecuteContext } from '@/lib/pipeline/context-builder'
import type { PlanResult } from '@/lib/pipeline/types'
import { resolveAIExecutionProfileFromWorkspace } from '@/lib/ai/resolver'
import { dispatchOrFallbackPhase, parseExecutionResult } from '@/lib/pipeline/runtime'

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
    const { run_id, executor_model: requested_executor_model = null, executor_fallback_chain: requested_executor_fallback_chain = null } = body

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
    const { profile } = await resolveAIExecutionProfileFromWorkspace({
      supabase,
      userId: user.id,
      workspaceId: run.workspace_id ?? null,
      useCase: 'pipeline_execute',
      requestedModel: requested_executor_model,
      requestedFallbackChain: Array.isArray(requested_executor_fallback_chain) ? requested_executor_fallback_chain : undefined,
    })
    const executor_model = profile.model

    const phase = await dispatchOrFallbackPhase({
      pipelineRunId: run.id,
      phase: 'execute',
      requestedModel: requested_executor_model ?? executor_model,
      resolvedModel: executor_model,
      fallbackChain: profile.fallback_chain,
      taskDescription: run.task_description,
      context,
    })

    if (!phase.ok) {
      await supabaseAdmin.from('pipeline_runs').update({ status: 'failed' }).eq('id', run.id)
      return mergeAuthResponse(internalErrorResponse('Failed to start execution phase', phase.error), authResponse)
    }

    const updates: Record<string, unknown> = {
      executor_run_id: phase.externalRunId ?? null,
      executor_model,
      routing_profile_id: profile.routing_profile_id ?? run.routing_profile_id,
      provider_chain: profile.fallback_chain,
      status: phase.externalRunId ? 'executing' : (run.auto_reviewed ? 'reviewing' : 'complete'),
      fallbacks_triggered: phase.fallbackEvents,
      execute_model_actual: phase.actualModel,
      executor_elapsed_ms: phase.elapsedMs,
    }

    if (phase.output) {
      const executionResult = parseExecutionResult(phase.output)
      const filesChanged = executionResult.patches?.map((patch) => patch.file) ?? []
      updates.execution_result = executionResult
      updates.files_changed = filesChanged
      updates.db_changes = filesChanged.some((file) => file.includes('migration') || file.includes('.sql') || file.includes('supabase/'))
    }

    await supabaseAdmin
      .from('pipeline_runs')
      .update(updates)
      .eq('id', run.id)

    return mergeAuthResponse(
      successResponse({ run_id: run.id, executor_run_id: phase.externalRunId ?? null, runner: phase.runner, actual_model: phase.actualModel, fallback_events: phase.fallbackEvents }),
      authResponse
    )
  } catch (err) {
    return mergeAuthResponse(
      internalErrorResponse('Unexpected error', err instanceof Error ? err.message : err),
      authResponse
    )
  }
}
