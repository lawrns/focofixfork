import { NextRequest } from 'next/server'
import { z } from 'zod'
import { mergeAuthResponse } from '@/lib/api/auth-helper'
import { createCommandStreamJob, publishCommandStreamEvent, setJobRunId } from '@/lib/command-surface/stream-broker'
import { mergeRunTrace } from '@/lib/runs/trace'
import { dispatchOpenClawTask } from '@/lib/openclaw/client'
import {
  databaseErrorResponse,
  invalidUUIDResponse,
  isValidUUID,
  successResponse,
  validationFailedResponse,
} from '@/lib/api/response-helpers'
import { getWorkspaceAgentRouteContext } from '@/lib/workspace-agent/api'
import { WorkspaceAgentStudioService } from '@/lib/workspace-agent/studio'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

const testRunSchema = z.object({
  notes: z.string().max(4000).optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; automationId: string }> },
) {
  const { id: workspaceId, automationId } = await params
  if (!isValidUUID(workspaceId)) return invalidUUIDResponse('workspaceId', workspaceId)
  if (!isValidUUID(automationId)) return invalidUUIDResponse('automationId', automationId)

  const contextResult = await getWorkspaceAgentRouteContext(request, workspaceId, 'admin')
  if (!contextResult.ok) return contextResult.response

  const {
    context: { authResponse, accessClient, user },
  } = contextResult

  try {
    const body = await request.json().catch(() => null)
    const parsed = testRunSchema.safeParse(body)
    if (!parsed.success) {
      return mergeAuthResponse(validationFailedResponse('Invalid automation test-run payload', parsed.error.flatten()), authResponse)
    }

    const studio = new WorkspaceAgentStudioService(accessClient)
    const jobId = createCommandStreamJob(user.id)
    const prepared = await studio.createAutomationRun(workspaceId, user.id, {
      automationId,
      triggerType: 'manual',
      jobId,
      additionalContext: {
        notes: parsed.data.notes ?? null,
      },
    })

    await setJobRunId(jobId, prepared.run_id)
    publishCommandStreamEvent(jobId, {
      type: 'status_update',
      status: 'queued',
      message: 'Automation queued for OpenClaw',
      timestamp: new Date().toISOString(),
    })

    const callbackUrl = new URL('/api/openclaw/callback', request.url).toString()
    const task = parsed.data.notes?.trim()
      ? `${prepared.automation.prompt}\n\nOperator note: ${parsed.data.notes.trim()}`
      : prepared.automation.prompt

    try {
      const dispatchResult = await dispatchOpenClawTask({
        agentId: prepared.automation.agent_id ?? 'cofounder',
        task,
        correlationId: prepared.run_id,
        callbackUrl,
        title: `Workspace automation ${prepared.automation.name}`,
        context: {
          source: 'workspace_automation',
          workspace_id: workspaceId,
          actor_user_id: user.id,
          ai_use_case: 'workspace_automation',
          automation_id: prepared.automation.id,
          automation_run_id: prepared.automation_run.id,
          agent_id: prepared.automation.agent_id,
          entity_type: prepared.automation.entity_type,
          entity_id: prepared.automation.entity_id,
          notes: parsed.data.notes ?? null,
        },
      })

      await mergeRunTrace(accessClient as any, prepared.run_id, {
        openclaw: {
          correlation_id: dispatchResult.correlationId,
          gateway_run_id: dispatchResult.runId,
          agent_id: prepared.automation.agent_id,
          status: dispatchResult.status,
          last_event_at: new Date().toISOString(),
          dispatch_kind: 'workspace_automation',
        },
      })

      return mergeAuthResponse(successResponse({
        automation: prepared.automation,
        automation_run: prepared.automation_run,
        run_id: prepared.run_id,
        job_id: jobId,
      }, undefined, 201), authResponse)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'OpenClaw dispatch failed'

      await accessClient
        .from('automation_runs')
        .update({
          status: 'failed',
          error: message,
          ended_at: new Date().toISOString(),
        })
        .eq('id', prepared.automation_run.id)

      await accessClient
        .from('automation_jobs')
        .update({
          last_status: 'failed',
          last_run_at: new Date().toISOString(),
        })
        .eq('id', prepared.automation.id)

      await mergeRunTrace(accessClient as any, prepared.run_id, {
        openclaw: {
          correlation_id: prepared.run_id,
          status: 'failed',
          last_error: message,
          last_event_at: new Date().toISOString(),
          dispatch_kind: 'workspace_automation',
        },
        command_surface: {
          job_id: jobId,
          stream_state: 'error',
          last_stream_event_at: new Date().toISOString(),
          last_error: message,
        },
      }, {
        status: 'failed',
        summary: message,
      })

      publishCommandStreamEvent(jobId, {
        type: 'error',
        message,
        timestamp: new Date().toISOString(),
      })
      publishCommandStreamEvent(jobId, {
        type: 'done',
        exitCode: 1,
        summary: message,
        timestamp: new Date().toISOString(),
      })

      return mergeAuthResponse(databaseErrorResponse('Failed to dispatch automation run', message), authResponse)
    }
  } catch (error) {
    return mergeAuthResponse(
      databaseErrorResponse('Failed to start automation test run', error instanceof Error ? error.message : error),
      authResponse,
    )
  }
}
