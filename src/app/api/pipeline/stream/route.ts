import { NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/api/auth-helper'
import { supabaseAdmin } from '@/lib/supabase-server'
import { buildPlanContext } from '@/lib/pipeline/context-builder'
import type { PipelinePhase, PipelineSSEEvent, ProjectReportRequest } from '@/lib/pipeline/types'
import { resolveAIExecutionProfileFromWorkspace } from '@/lib/ai/resolver'
import { dispatchPipelinePhase } from '@/lib/pipeline/dispatcher'
import { persistProjectReport } from '@/lib/project-reports'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

function authHeaders(req: NextRequest): HeadersInit {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const cookie = req.headers.get('cookie')
  if (cookie) headers.cookie = cookie
  return headers
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function emitEvent(controller: ReadableStreamDefaultController<Uint8Array>, encoder: TextEncoder, event: PipelineSSEEvent) {
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
}

async function dispatchLocalPhase(
  req: NextRequest,
  path: '/api/pipeline/execute' | '/api/pipeline/review',
  body: Record<string, unknown>,
) {
  const res = await fetch(new URL(path, req.nextUrl.origin), {
    method: 'POST',
    headers: authHeaders(req),
    body: JSON.stringify(body),
    cache: 'no-store',
  })

  const json = await res.json().catch(() => null)
  if (!res.ok || !json?.ok) {
    throw new Error(json?.error?.message ?? json?.error ?? `Phase dispatch failed (${res.status})`)
  }
  return json
}

export async function POST(req: NextRequest) {
  const { user, supabase, error } = await getAuthUser(req)
  if (error || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  if (!supabaseAdmin) {
    return new Response(JSON.stringify({ error: 'DB not available' }), { status: 500 })
  }

  const body = await req.json()
  const {
    task_description,
    planner_model: requested_planner_model = null,
    planner_fallback_chain: requested_planner_fallback_chain = null,
    executor_model: requested_executor_model = null,
    executor_fallback_chain: requested_executor_fallback_chain = null,
    reviewer_model: requested_reviewer_model = null,
    reviewer_fallback_chain: requested_reviewer_fallback_chain = null,
    auto_review = false,
    handbook_slug = 'general',
    project_id = null,
    workspace_id = null,
    selected_agents = null,
    context = null,
    planning_goal = null,
    constraints = null,
    limits = null,
    report_request = null,
  } = body

  if (!task_description?.trim()) {
    return new Response(JSON.stringify({ error: 'task_description is required' }), { status: 400 })
  }

  const workspaceId = workspace_id ?? null
  const normalizedReportRequest = report_request && typeof report_request === 'object'
    ? report_request as ProjectReportRequest
    : null

  const [{ profile: plannerProfile }, { profile: executorProfile }, { profile: reviewerProfile }] = await Promise.all([
    resolveAIExecutionProfileFromWorkspace({
      supabase,
      userId: user.id,
      workspaceId,
      useCase: 'pipeline_plan',
      requestedModel: requested_planner_model,
      requestedFallbackChain: Array.isArray(requested_planner_fallback_chain) ? requested_planner_fallback_chain : undefined,
    }),
    resolveAIExecutionProfileFromWorkspace({
      supabase,
      userId: user.id,
      workspaceId,
      useCase: 'pipeline_execute',
      requestedModel: requested_executor_model,
      requestedFallbackChain: Array.isArray(requested_executor_fallback_chain) ? requested_executor_fallback_chain : undefined,
    }),
    resolveAIExecutionProfileFromWorkspace({
      supabase,
      userId: user.id,
      workspaceId,
      useCase: 'pipeline_review',
      requestedModel: requested_reviewer_model,
      requestedFallbackChain: Array.isArray(requested_reviewer_fallback_chain) ? requested_reviewer_fallback_chain : undefined,
    }),
  ])

  const planner_model = plannerProfile.model
  const executor_model = executorProfile.model
  const reviewer_model = reviewerProfile.model

  const startedAt = new Date().toISOString()
  const { data: run, error: insertError } = await supabaseAdmin
    .from('pipeline_runs')
    .insert({
      user_id: user.id,
      workspace_id: workspaceId,
      task_description: task_description.trim(),
      planner_model,
      executor_model,
      reviewer_model,
      routing_profile_id: plannerProfile.routing_profile_id,
      provider_chain: Array.from(new Set([
        ...plannerProfile.fallback_chain,
        ...executorProfile.fallback_chain,
        ...reviewerProfile.fallback_chain,
      ])),
      status: 'planning',
      auto_reviewed: auto_review,
      handbook_ref: handbook_slug || null,
      started_at: startedAt,
      ...(project_id ? { project_id } : {}),
    })
    .select('id')
    .single()

  if (insertError || !run) {
    return new Response(JSON.stringify({ error: 'Failed to create pipeline run' }), { status: 500 })
  }

  const runId = run.id
  const planContext = buildPlanContext(task_description, {
    selected_agents,
    context: normalizedReportRequest?.enabled
      ? {
          ...(context && typeof context === 'object' ? context as Record<string, unknown> : {}),
          report_mode: true,
          report_type: normalizedReportRequest.report_type,
        }
      : context,
    planning_goal,
    constraints,
    limits,
  })

  let plannerRunId: string | null = null
  try {
    plannerRunId = await dispatchPipelinePhase({
      pipelineRunId: runId,
      phase: 'plan',
      preferredModel: planner_model,
      taskDescription: task_description,
      context: planContext,
    })

    await supabaseAdmin
      .from('pipeline_runs')
      .update({ planner_run_id: plannerRunId })
      .eq('id', runId)
  } catch (dispatchError) {
    const message = dispatchError instanceof Error ? dispatchError.message : 'Failed to start planning phase'
    await supabaseAdmin
      .from('pipeline_runs')
      .update({ status: 'failed' })
      .eq('id', runId)
    return new Response(JSON.stringify({ error: message }), { status: 502 })
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const pipelineStartMs = Date.now()
      const seenPhaseComplete = new Set<PipelinePhase>()
      let executeTriggered = false
      let reviewTriggered = false
      let reportCreated = false
      let closed = false

      const close = () => {
        if (closed) return
        closed = true
        controller.close()
      }

      emitEvent(controller, encoder, { type: 'run_start', run_id: runId, started_at: pipelineStartMs })
      emitEvent(controller, encoder, {
        type: 'run_profile',
        requested: {
          plan: requested_planner_model,
          execute: requested_executor_model,
          review: requested_reviewer_model,
        },
        resolved: {
          plan: planner_model,
          execute: executor_model,
          review: reviewer_model,
        },
        fallback_chain: {
          plan: plannerProfile.fallback_chain,
          execute: executorProfile.fallback_chain,
          review: reviewerProfile.fallback_chain,
        },
        provider_chain: Array.from(new Set([
          ...plannerProfile.fallback_chain,
          ...executorProfile.fallback_chain,
          ...reviewerProfile.fallback_chain,
        ])),
        routing_profile_id: plannerProfile.routing_profile_id ?? null,
      })
      emitEvent(controller, encoder, { type: 'phase_start', phase: 'plan', model: planner_model })
      emitEvent(controller, encoder, {
        type: 'phase_routing',
        phase: 'plan',
        requested_model: requested_planner_model,
        resolved_model: planner_model,
        actual_model: null,
        runner: 'openclaw_stream',
      })
      emitEvent(controller, encoder, { type: 'activity', phase: 'plan', message: 'Planning phase dispatched to OpenClaw' })

      const startedAtMs = Date.now()

      while (!closed && Date.now() - startedAtMs < 295_000) {
        const { data: currentRun } = await supabaseAdmin
          .from('pipeline_runs')
          .select('*')
          .eq('id', runId)
          .single()

        if (!currentRun) {
          emitEvent(controller, encoder, { type: 'pipeline_error', message: 'Pipeline run no longer exists' })
          close()
          return
        }

        if (currentRun.status === 'cancelled') {
          emitEvent(controller, encoder, { type: 'pipeline_error', message: 'Pipeline cancelled' })
          close()
          return
        }

        if (currentRun.status === 'failed') {
          emitEvent(controller, encoder, {
            type: 'pipeline_error',
            message: typeof currentRun.review_result?.summary === 'string'
              ? currentRun.review_result.summary
              : typeof currentRun.execution_result?.summary === 'string'
                ? currentRun.execution_result.summary
                : typeof currentRun.plan_result?.summary === 'string'
                  ? currentRun.plan_result.summary
                  : 'Pipeline failed',
          })
          close()
          return
        }

        if (currentRun.plan_result && !seenPhaseComplete.has('plan')) {
          seenPhaseComplete.add('plan')
          emitEvent(controller, encoder, {
            type: 'phase_complete',
            phase: 'plan',
            elapsed_ms: currentRun.planner_elapsed_ms ?? Math.max(Date.now() - pipelineStartMs, 1),
            result: currentRun.plan_result,
          })
        }

        if (currentRun.plan_result && !executeTriggered) {
          executeTriggered = true
          emitEvent(controller, encoder, { type: 'phase_start', phase: 'execute', model: executor_model })
          emitEvent(controller, encoder, {
            type: 'phase_routing',
            phase: 'execute',
            requested_model: requested_executor_model,
            resolved_model: executor_model,
            actual_model: null,
            runner: 'openclaw_stream',
          })
          emitEvent(controller, encoder, { type: 'activity', phase: 'execute', message: 'Execution phase dispatched to OpenClaw' })

          try {
            await dispatchLocalPhase(req, '/api/pipeline/execute', {
              run_id: runId,
              executor_model: requested_executor_model,
              executor_fallback_chain: requested_executor_fallback_chain,
            })
          } catch (phaseError) {
            emitEvent(controller, encoder, {
              type: 'phase_error',
              phase: 'execute',
              message: phaseError instanceof Error ? phaseError.message : 'Failed to dispatch execute phase',
            })
            emitEvent(controller, encoder, {
              type: 'pipeline_error',
              message: phaseError instanceof Error ? phaseError.message : 'Failed to dispatch execute phase',
            })
            close()
            return
          }
        }

        if (currentRun.execution_result && !seenPhaseComplete.has('execute')) {
          seenPhaseComplete.add('execute')
          emitEvent(controller, encoder, {
            type: 'phase_complete',
            phase: 'execute',
            elapsed_ms: currentRun.executor_elapsed_ms ?? Math.max(Date.now() - pipelineStartMs, 1),
            result: currentRun.execution_result,
          })
        }

        if (currentRun.execution_result && currentRun.auto_reviewed && !reviewTriggered) {
          reviewTriggered = true
          emitEvent(controller, encoder, { type: 'phase_start', phase: 'review', model: reviewer_model })
          emitEvent(controller, encoder, {
            type: 'phase_routing',
            phase: 'review',
            requested_model: requested_reviewer_model,
            resolved_model: reviewer_model,
            actual_model: null,
            runner: 'openclaw_stream',
          })
          emitEvent(controller, encoder, { type: 'activity', phase: 'review', message: 'Review phase dispatched to OpenClaw' })

          try {
            await dispatchLocalPhase(req, '/api/pipeline/review', {
              run_id: runId,
              reviewer_model: requested_reviewer_model,
              reviewer_fallback_chain: requested_reviewer_fallback_chain,
              handbook_slug: handbook_slug || 'general',
            })
          } catch (phaseError) {
            emitEvent(controller, encoder, {
              type: 'phase_error',
              phase: 'review',
              message: phaseError instanceof Error ? phaseError.message : 'Failed to dispatch review phase',
            })
            emitEvent(controller, encoder, {
              type: 'pipeline_error',
              message: phaseError instanceof Error ? phaseError.message : 'Failed to dispatch review phase',
            })
            close()
            return
          }
        }

        if (currentRun.review_result && !seenPhaseComplete.has('review')) {
          seenPhaseComplete.add('review')
          emitEvent(controller, encoder, {
            type: 'phase_complete',
            phase: 'review',
            elapsed_ms: currentRun.reviewer_elapsed_ms ?? Math.max(Date.now() - pipelineStartMs, 1),
            result: currentRun.review_result,
          })
        }

        if (
          normalizedReportRequest?.enabled &&
          !reportCreated &&
          currentRun.plan_result &&
          currentRun.review_result &&
          currentRun.project_id &&
          workspaceId
        ) {
          const { data: project } = await supabaseAdmin
            .from('foco_projects')
            .select('name')
            .eq('id', currentRun.project_id)
            .maybeSingle()

          if (project?.name) {
            try {
              const report = await persistProjectReport(supabaseAdmin, {
                projectId: currentRun.project_id,
                workspaceId,
                userId: user.id,
                runId,
                taskDescription: currentRun.task_description,
                projectName: project.name,
                reportType: normalizedReportRequest.report_type,
                selectedAgentId: normalizedReportRequest.selected_agent_id ?? null,
                selectedAgentName: normalizedReportRequest.selected_agent_name ?? null,
                planResult: currentRun.plan_result,
                reviewResult: currentRun.review_result,
              })
              reportCreated = true
              emitEvent(controller, encoder, {
                type: 'report_created',
                report_id: report.reportId,
                artifact_id: report.artifactId,
                title: report.title,
              })
            } catch {
              // report persistence is non-fatal for the pipeline stream
            }
          }
        }

        const isDoneWithoutReview = Boolean(currentRun.execution_result) && !currentRun.auto_reviewed
        const isDoneWithReview = Boolean(currentRun.review_result)
        if (isDoneWithoutReview || isDoneWithReview) {
          emitEvent(controller, encoder, {
            type: 'pipeline_complete',
            run_id: runId,
            total_elapsed_ms: Math.max(Date.now() - pipelineStartMs, 1),
          })
          close()
          return
        }

        await delay(1000)
      }

      emitEvent(controller, encoder, {
        type: 'pipeline_error',
        message: 'Pipeline stream timed out while waiting for OpenClaw callbacks',
      })
      close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
