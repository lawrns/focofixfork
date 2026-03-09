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
import { mergeRunTrace } from '@/lib/runs/trace'
import { redactSensitiveText } from '@/lib/security/redaction'
import { dispatchOpenClawTask } from '@/lib/openclaw/client'

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
  const correlationId = bootstrapRunId ?? crypto.randomUUID()
  const timestamp = () => new Date().toISOString()
  const callbackUrl = new URL('/api/openclaw/callback', req.url).toString()

  const persistCommandSurfaceState = async (
    runId: string | null,
    patch: Record<string, unknown>,
  ) => {
    if (!runId) return
    await mergeRunTrace(supabase, runId, {
      command_surface: patch,
    })
  }

  if (bootstrapRunId) {
    await setJobRunId(jobId, bootstrapRunId)
    await persistCommandSurfaceState(bootstrapRunId, {
      job_id: jobId,
      stream_state: 'queued',
      last_stream_event_at: timestamp(),
    })
    await mergeRunTrace(supabase, bootstrapRunId, {
      openclaw: {
        correlation_id: correlationId,
        dispatch_kind: 'command_surface',
        status: 'queued',
        last_event_at: timestamp(),
      },
    })
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

  const primaryAgentId = Array.isArray(selected_agents)
    ? selected_agents.find((item): item is string => typeof item === 'string' && item.trim().length > 0) ?? 'cofounder'
    : 'cofounder'

  try {
    const dispatchResult = await dispatchOpenClawTask({
      agentId: primaryAgentId,
      task: prompt,
      correlationId,
      callbackUrl,
      taskId: task_id ?? undefined,
      title: bootstrapRunId ? `Command surface run ${bootstrapRunId}` : 'Command surface run',
      context: {
        source: 'command_surface',
        workspace_id: workspace_id ?? null,
        project_id: project_id ?? null,
        task_id: task_id ?? null,
        mode: normalizedMode,
        lane: isLane(lane) ? lane : null,
        run_id: bootstrapRunId,
        selected_agents: selected_agents ?? null,
        planning_context: context ?? null,
        planning_goal: planning_goal ?? null,
        constraints: constraints ?? null,
        limits: limits ?? null,
        report_request: report_request ?? null,
        actor_user_id: user.id,
      },
    })

    if (bootstrapRunId) {
      await mergeRunTrace(supabase, bootstrapRunId, {
        openclaw: {
          correlation_id: dispatchResult.correlationId,
          gateway_run_id: dispatchResult.runId,
          agent_id: primaryAgentId,
          status: dispatchResult.status,
          last_event_at: timestamp(),
          last_summary: 'Task accepted by OpenClaw gateway',
          dispatch_kind: 'command_surface',
        },
      })
    }

    publishCommandStreamEvent(jobId, {
      type: 'status_update',
      status: 'executing',
      message: 'Task accepted by OpenClaw gateway',
      timestamp: timestamp(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'OpenClaw dispatch failed'
    if (bootstrapRunId) {
      await mergeRunTrace(supabase, bootstrapRunId, {
        command_surface: {
          job_id: jobId,
          stream_state: 'error',
          last_stream_event_at: timestamp(),
          last_error: message,
        },
        openclaw: {
          correlation_id: correlationId,
          agent_id: primaryAgentId,
          status: 'error',
          last_event_at: timestamp(),
          last_error: message,
          dispatch_kind: 'command_surface',
        },
      }, {
        status: 'failed',
        summary: redactSensitiveText(prompt.trim()).slice(0, 180),
      })
    }

    publishCommandStreamEvent(jobId, {
      type: 'error',
      message,
      timestamp: timestamp(),
    })
    publishCommandStreamEvent(jobId, {
      type: 'done',
      exitCode: 1,
      summary: message,
      timestamp: timestamp(),
    })

    return mergeAuthResponse(
      NextResponse.json({ error: message }, { status: 502 }),
      authResponse,
    )
  }

  return mergeAuthResponse(
    NextResponse.json({
      ok: true,
      job_id: jobId,
      stream_url: `/api/command-surface/stream/${jobId}`,
      correlation_id: correlationId,
    }),
    authResponse,
  )
}
