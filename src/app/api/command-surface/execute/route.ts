/**
 * POST /api/command-surface/execute
 *
 * Asynchronously dispatches the command pipeline and immediately returns
 * a stream handle `{ job_id, stream_url }` for live client updates.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { logClawdActionVisibility } from '@/lib/cofounder-mode/clawd-visibility'
import { isLane } from '@/lib/agent-ops/lane-policy'
import { createCommandStreamJob, publishCommandStreamEvent, setJobRunId } from '@/lib/command-surface/stream-broker'
import { resolveAIExecutionProfileFromWorkspace } from '@/lib/ai/resolver'
import { redactSensitiveText } from '@/lib/security/redaction'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

function safeString(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

async function readUpstreamError(res: Response): Promise<string | null> {
  try {
    const text = await res.text()
    if (!text) return null
    try {
      const json = JSON.parse(text) as Record<string, unknown>
      const message =
        (typeof json.error === 'string' && json.error) ||
        (typeof json.message === 'string' && json.message) ||
        (typeof json.detail === 'string' && json.detail) ||
        null
      return message ?? text.slice(0, 300)
    } catch {
      return text.slice(0, 300)
    }
  } catch {
    return null
  }
}

type RunnerArgs = {
  jobId: string
  origin: string
  cookieHeader: string | null
  supabase: any
  workspaceId: string | null
  userId: string
  userEmail: string | null
  prompt: string
  mode: string
  projectId: string | null
  lane: string | null
  taskId: string | null
  requestedModel: string | null
  requestedPlannerModel: string | null
  requestedExecutorModel: string | null
  requestedReviewerModel: string | null
  requestedFallbackChain: string[] | null
  selectedAgents: unknown
  planningContext: unknown
  planningGoal: string | null
  constraints: unknown
  limits: unknown
  reportRequest: Record<string, unknown> | null
  bootstrapRunId: string | null
}

async function runPipelineForJob(args: RunnerArgs): Promise<void> {
  const {
    jobId,
    origin,
    cookieHeader,
    supabase,
    workspaceId,
    userId,
    userEmail,
    prompt,
    mode,
    projectId,
    lane,
    taskId,
    requestedModel,
    requestedPlannerModel,
    requestedExecutorModel,
    requestedReviewerModel,
    requestedFallbackChain,
    selectedAgents,
    planningContext,
    planningGoal,
    constraints,
    limits,
    reportRequest,
    bootstrapRunId,
  } = args

  const timestamp = () => new Date().toISOString()

  const pushStatus = (status: 'queued' | 'executing' | 'completed' | 'error', message?: string, phase?: string) => {
    publishCommandStreamEvent(jobId, {
      type: 'status_update',
      status,
      message,
      phase,
      timestamp: timestamp(),
    })
  }

  const pushReasoning = (text: string, phase?: string) => {
    publishCommandStreamEvent(jobId, {
      type: 'reasoning',
      text,
      phase,
      timestamp: timestamp(),
    })
  }

  const pushOutput = (text: string, phase?: string) => {
    publishCommandStreamEvent(jobId, {
      type: 'output_chunk',
      text,
      phase,
      timestamp: timestamp(),
    })
  }

  let doneSent = false

  const finish = (exitCode: number, summary?: string) => {
    if (doneSent) return
    doneSent = true
    if (exitCode === 0) {
      pushStatus('completed', summary ?? 'Execution complete')
    } else {
      pushStatus('error', summary ?? 'Execution failed')
    }
    publishCommandStreamEvent(jobId, {
      type: 'done',
      exitCode,
      summary,
      timestamp: timestamp(),
    })
  }

  const fail = (message: string) => {
    publishCommandStreamEvent(jobId, {
      type: 'error',
      message,
      timestamp: timestamp(),
    })
    finish(1, message)
  }

  pushStatus('executing', 'Dispatching command pipeline')

  try {
    const cookieWorkspaceMatch = cookieHeader?.match(/workspace_id=([^;]+)/)
    const resolvedWorkspaceId = workspaceId ?? (cookieWorkspaceMatch?.[1] ? decodeURIComponent(cookieWorkspaceMatch[1]) : null)
    const [{ profile: planProfile }, { profile: executeProfile }, { profile: reviewProfile }] = await Promise.all([
      resolveAIExecutionProfileFromWorkspace({
        supabase,
        userId,
        workspaceId: resolvedWorkspaceId,
        useCase: 'command_surface_plan',
        requestedModel: requestedPlannerModel ?? requestedModel,
        requestedFallbackChain,
      }),
      resolveAIExecutionProfileFromWorkspace({
        supabase,
        userId,
        workspaceId: resolvedWorkspaceId,
        useCase: 'command_surface_execute',
        requestedModel: requestedExecutorModel ?? requestedModel,
        requestedFallbackChain,
      }),
      resolveAIExecutionProfileFromWorkspace({
        supabase,
        userId,
        workspaceId: resolvedWorkspaceId,
        useCase: 'command_surface_review',
        requestedModel: requestedReviewerModel ?? requestedModel,
        requestedFallbackChain,
      }),
    ])
    const plannerModel = planProfile.model
    const executorModel = executeProfile.model
    const reviewerModel = reviewProfile.model
    const normalizedLane = isLane(lane) ? lane : null

    if (bootstrapRunId) {
      await supabase
        .from('runs')
        .update({
          trace: {
            ai_routing: {
              requested: {
                model: requestedModel,
                planner_model: requestedPlannerModel,
                executor_model: requestedExecutorModel,
                reviewer_model: requestedReviewerModel,
                fallback_chain: requestedFallbackChain ?? [],
              },
              actual: {
                planner_model: plannerModel,
                executor_model: executorModel,
                reviewer_model: reviewerModel,
                planner_provider: planProfile.provider,
                executor_provider: executeProfile.provider,
                reviewer_provider: reviewProfile.provider,
                fallback_chain: executeProfile.fallback_chain,
              },
            },
            command_surface: {
              job_id: jobId,
              workspace_id: resolvedWorkspaceId,
              project_id: projectId,
              lane: normalizedLane,
            },
          },
        })
        .eq('id', bootstrapRunId)
    }

    const pipelineRes = await fetch(`${origin}/api/pipeline/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(cookieHeader ? { cookie: cookieHeader } : {}),
      },
      body: JSON.stringify({
        task_description:
          `Command Surface request\n` +
          `Mode: ${mode}\n` +
          `User: ${userEmail ?? userId}\n\n` +
          `${prompt.trim()}`,
        routing_profile_id: planProfile.routing_profile_id,
        planner_model: plannerModel,
        executor_model: executorModel,
        reviewer_model: reviewerModel,
        auto_review: true,
        handbook_slug: 'general',
        project_id: projectId,
        task_id: taskId,
        lane: normalizedLane,
        selected_agents: selectedAgents,
        context: planningContext,
        planning_goal: planningGoal,
        constraints,
        limits,
        report_request: reportRequest,
      }),
      signal: AbortSignal.timeout(300_000),
    })

    if (!pipelineRes.ok || !pipelineRes.body) {
      const upstreamDetail = await readUpstreamError(pipelineRes)
      const detail = upstreamDetail ? `: ${upstreamDetail}` : ''
      fail(`Agent service returned HTTP ${pipelineRes.status}${detail}`)
      return
    }

    const reader = pipelineRes.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        try {
          const event = JSON.parse(line.slice(6)) as Record<string, unknown>
          const type = typeof event.type === 'string' ? event.type : ''
          const phase = typeof event.phase === 'string' ? event.phase : undefined

          if (type === 'text_delta' && typeof event.text === 'string') {
            pushOutput(event.text, phase)
            continue
          }

          if (type === 'activity' && typeof event.message === 'string') {
            pushReasoning(event.message, phase)
            continue
          }

          if (type === 'run_start' && typeof event.run_id === 'string') {
            void setJobRunId(jobId, event.run_id)
          }

          if (type === 'phase_start') {
            pushStatus('executing', `Phase started: ${phase ?? 'unknown'}`, phase)
            continue
          }

          if (type === 'phase_complete') {
            pushStatus('executing', `Phase complete: ${phase ?? 'unknown'}`, phase)
            continue
          }

          if (type === 'report_created' && typeof event.title === 'string') {
            pushReasoning(`Report created: ${event.title}`, phase)
            continue
          }

          if (type === 'phase_error' || type === 'pipeline_error') {
            const message = typeof event.message === 'string' ? event.message : 'Pipeline execution failed'
            fail(message)
            return
          }

          if (type === 'pipeline_complete') {
            finish(0, 'Pipeline complete')
            return
          }
        } catch {
          // Ignore malformed SSE lines from upstream pipeline.
        }
      }
    }

    finish(0, 'Pipeline stream closed')
  } catch (err) {
    fail(`Execution error: ${safeString(err)}`)
  }
}

export async function POST(req: NextRequest) {
  const { user, supabase, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) {
    return mergeAuthResponse(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), authResponse)
  }

  const body = await req.json().catch(() => null)
  const { prompt, mode, project_id, workspace_id, lane, task_id, selected_agents, context, planning_goal, constraints, limits, report_request, bootstrap_run_id, requested_model, requested_planner_model, requested_executor_model, requested_reviewer_model, requested_fallback_chain } = body as {
    prompt?: string
    mode?: string
    project_id?: string | null
    workspace_id?: string | null
    lane?: string | null
    task_id?: string | null
    selected_agents?: unknown
    context?: unknown
    planning_goal?: string | null
    constraints?: unknown
    limits?: unknown
    report_request?: Record<string, unknown> | null
    bootstrap_run_id?: string | null
    requested_model?: string | null
    requested_planner_model?: string | null
    requested_executor_model?: string | null
    requested_reviewer_model?: string | null
    requested_fallback_chain?: string[] | null
  }

  if (!prompt?.trim()) {
    return mergeAuthResponse(
      NextResponse.json({ error: 'prompt is required' }, { status: 400 }),
      authResponse
    )
  }

  const normalizedMode = typeof mode === 'string' && mode.trim() ? mode : 'auto'
  const jobId = createCommandStreamJob(user.id)
  const bootstrapRunId = typeof bootstrap_run_id === 'string' && bootstrap_run_id.trim() ? bootstrap_run_id.trim() : null

  if (bootstrapRunId) {
    await setJobRunId(jobId, bootstrapRunId)
  }

  publishCommandStreamEvent(jobId, {
    type: 'status_update',
    status: 'queued',
    message: bootstrapRunId ? 'Queued for dispatch. Saved run is ready.' : 'Queued for dispatch',
    timestamp: new Date().toISOString(),
  })

  try {
    await logClawdActionVisibility(supabase, {
      userId: user.id,
      eventType: 'clawd_command_surface_dispatch',
      title: 'Command surface execution dispatched',
      detail: redactSensitiveText(prompt.trim()).slice(0, 180),
      payload: {
        mode: normalizedMode,
        lane: isLane(lane) ? lane : null,
        task_id: task_id ?? null,
        bootstrap_run_id: bootstrapRunId,
      },
    })
  } catch {
    // Visibility telemetry is non-blocking.
  }

  void runPipelineForJob({
    jobId,
    origin: req.nextUrl.origin,
    cookieHeader: req.headers.get('cookie'),
    supabase,
    workspaceId: workspace_id ?? null,
    userId: user.id,
    userEmail: user.email ?? null,
    prompt,
    mode: normalizedMode,
    projectId: project_id ?? null,
    lane: lane ?? null,
    taskId: task_id ?? null,
    requestedModel: requested_model ?? null,
    requestedPlannerModel: requested_planner_model ?? null,
    requestedExecutorModel: requested_executor_model ?? null,
    requestedReviewerModel: requested_reviewer_model ?? null,
    requestedFallbackChain: Array.isArray(requested_fallback_chain)
      ? requested_fallback_chain.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      : null,
    selectedAgents: selected_agents ?? null,
    planningContext: context ?? null,
    planningGoal: planning_goal ?? null,
    constraints: constraints ?? null,
    limits: limits ?? null,
    reportRequest: report_request ?? null,
    bootstrapRunId,
  })

  return mergeAuthResponse(
    NextResponse.json({
      ok: true,
      job_id: jobId,
      stream_url: `/api/command-surface/stream/${jobId}`,
    }),
    authResponse
  )
}
