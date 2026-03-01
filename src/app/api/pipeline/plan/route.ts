import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { successResponse, authRequiredResponse, badRequestResponse, internalErrorResponse } from '@/lib/api/response-helpers'
import { supabaseAdmin } from '@/lib/supabase-server'
import { dispatchPipelinePhase } from '@/lib/pipeline/dispatcher'
import { buildPlanContext } from '@/lib/pipeline/context-builder'

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
    const { task_description, planner_model = 'claude-opus-4-6', workspace_id } = body

    if (!task_description?.trim()) {
      return mergeAuthResponse(badRequestResponse('task_description is required'), authResponse)
    }

    if (!supabaseAdmin) {
      return mergeAuthResponse(internalErrorResponse('DB not available'), authResponse)
    }

    // Create pipeline_runs row
    const { data: run, error: insertError } = await supabaseAdmin
      .from('pipeline_runs')
      .insert({
        user_id: user.id,
        workspace_id: workspace_id ?? null,
        task_description: task_description.trim(),
        planner_model,
        status: 'planning',
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (insertError || !run) {
      return mergeAuthResponse(internalErrorResponse('Failed to create pipeline run', insertError), authResponse)
    }

    // Build context and dispatch to ClawdBot
    const context = buildPlanContext(task_description)

    let plannerRunId: string | null = null
    try {
      plannerRunId = await dispatchPipelinePhase({
        pipelineRunId: run.id,
        phase: 'plan',
        preferredModel: planner_model,
        taskDescription: task_description,
        context,
      })
    } catch (dispatchErr) {
      // Log but don't fail — run stays in 'planning' state
      console.error('[Pipeline:plan] dispatch error:', dispatchErr)
    }

    // Update planner_run_id
    if (plannerRunId) {
      await supabaseAdmin
        .from('pipeline_runs')
        .update({ planner_run_id: plannerRunId })
        .eq('id', run.id)
    }

    return mergeAuthResponse(
      successResponse({ run_id: run.id, planner_run_id: plannerRunId }),
      authResponse
    )
  } catch (err) {
    return mergeAuthResponse(
      internalErrorResponse('Unexpected error', err instanceof Error ? err.message : err),
      authResponse
    )
  }
}
