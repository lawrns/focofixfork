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
import { runPipelineStreamJob } from '@/lib/command-surface/pipeline-runner'
import { redactSensitiveText } from '@/lib/security/redaction'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function POST(req: NextRequest) {
  const { user, supabase, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) {
    return mergeAuthResponse(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), authResponse)
  }

  const body = await req.json().catch(() => null)
  const {
    prompt,
    mode,
    project_id,
    workspace_id,
    lane,
    task_id,
    selected_agents,
    context,
    planning_goal,
    constraints,
    limits,
    report_request,
    bootstrap_run_id,
    requested_model,
    requested_planner_model,
    requested_executor_model,
    requested_reviewer_model,
    requested_fallback_chain,
  } = body as {
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
      authResponse,
    )
  }

  const normalizedMode = typeof mode === 'string' && mode.trim() ? mode : 'auto'
  const jobId = createCommandStreamJob(user.id)
  const bootstrapRunId = typeof bootstrap_run_id === 'string' && bootstrap_run_id.trim() ? bootstrap_run_id.trim() : null
  const timestamp = () => new Date().toISOString()

  if (bootstrapRunId) {
    await setJobRunId(jobId, bootstrapRunId)
  }

  publishCommandStreamEvent(jobId, {
    type: 'status_update',
    status: 'queued',
    message: bootstrapRunId ? 'Queued for dispatch. Saved run is ready.' : 'Queued for dispatch',
    timestamp: timestamp(),
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
    // Visibility telemetry is non-fatal.
  }

  void runPipelineStreamJob({
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
  }, {
    onStatusUpdate(status, message, phase) {
      publishCommandStreamEvent(jobId, {
        type: 'status_update',
        status,
        message,
        phase,
        timestamp: timestamp(),
      })
    },
    onReasoning(text, phase) {
      publishCommandStreamEvent(jobId, {
        type: 'reasoning',
        text,
        phase,
        timestamp: timestamp(),
      })
    },
    onOutput(text, phase) {
      publishCommandStreamEvent(jobId, {
        type: 'output_chunk',
        text,
        phase,
        timestamp: timestamp(),
      })
    },
    onRunStart(runId) {
      return setJobRunId(jobId, runId)
    },
    onPhaseError(message) {
      publishCommandStreamEvent(jobId, {
        type: 'error',
        message,
        timestamp: timestamp(),
      })
    },
    onDone(exitCode, summary) {
      publishCommandStreamEvent(jobId, {
        type: 'done',
        exitCode,
        summary,
        timestamp: timestamp(),
      })
    },
  })

  return mergeAuthResponse(
    NextResponse.json({
      ok: true,
      job_id: jobId,
      stream_url: `/api/command-surface/stream/${jobId}`,
    }),
    authResponse,
  )
}
