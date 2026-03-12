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
  notFoundResponse,
  successResponse,
  validationFailedResponse,
} from '@/lib/api/response-helpers'
import { getWorkspaceAgentRouteContext } from '@/lib/workspace-agent/api'
import { WorkspaceAgentStudioService } from '@/lib/workspace-agent/studio'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

const postMessageSchema = z.object({
  content: z.string().trim().min(1).max(12000),
  agent_id: z.string().min(1).max(200).nullable().optional(),
  ai_use_case: z.enum(['workspace_plan', 'workspace_execute', 'workspace_review']).default('workspace_execute'),
  additional_context: z.record(z.unknown()).optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; threadId: string }> },
) {
  const { id: workspaceId, threadId } = await params
  if (!isValidUUID(workspaceId)) return invalidUUIDResponse('workspaceId', workspaceId)
  if (!isValidUUID(threadId)) return invalidUUIDResponse('threadId', threadId)

  const contextResult = await getWorkspaceAgentRouteContext(request, workspaceId)
  if (!contextResult.ok) return contextResult.response

  const {
    context: { authResponse, accessClient },
  } = contextResult

  try {
    const studio = new WorkspaceAgentStudioService(accessClient)
    const thread = await studio.getThread(workspaceId, threadId)
    if (!thread) return mergeAuthResponse(notFoundResponse('Thread', threadId), authResponse)

    const messages = await studio.listThreadMessages(workspaceId, threadId)
    return mergeAuthResponse(successResponse({ thread, messages, count: messages.length }), authResponse)
  } catch (error) {
    return mergeAuthResponse(
      databaseErrorResponse('Failed to fetch thread messages', error instanceof Error ? error.message : error),
      authResponse,
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; threadId: string }> },
) {
  const { id: workspaceId, threadId } = await params
  if (!isValidUUID(workspaceId)) return invalidUUIDResponse('workspaceId', workspaceId)
  if (!isValidUUID(threadId)) return invalidUUIDResponse('threadId', threadId)

  const contextResult = await getWorkspaceAgentRouteContext(request, workspaceId)
  if (!contextResult.ok) return contextResult.response

  const {
    context: { authResponse, accessClient, user },
  } = contextResult

  try {
    const body = await request.json().catch(() => null)
    const parsed = postMessageSchema.safeParse(body)
    if (!parsed.success) {
      return mergeAuthResponse(validationFailedResponse('Invalid thread message payload', parsed.error.flatten()), authResponse)
    }

    const studio = new WorkspaceAgentStudioService(accessClient)
    const thread = await studio.getThread(workspaceId, threadId)
    if (!thread) return mergeAuthResponse(notFoundResponse('Thread', threadId), authResponse)

    const jobId = createCommandStreamJob(user.id)
    const prepared = await studio.createRunWithThreadMessages(workspaceId, user.id, {
      threadId: thread.id,
      agentId: parsed.data.agent_id ?? thread.agent_id,
      task: parsed.data.content,
      useCase: parsed.data.ai_use_case,
      entityType: thread.entity_type,
      entityId: thread.entity_id,
      jobId,
      additionalContext: parsed.data.additional_context,
    })

    await setJobRunId(jobId, prepared.run_id)
    publishCommandStreamEvent(jobId, {
      type: 'status_update',
      status: 'queued',
      message: 'Queued for OpenClaw',
      timestamp: new Date().toISOString(),
    })

    const callbackUrl = new URL('/api/openclaw/callback', request.url).toString()

    try {
      const dispatchResult = await dispatchOpenClawTask({
        agentId: parsed.data.agent_id ?? thread.agent_id ?? 'cofounder',
        task: parsed.data.content,
        correlationId: prepared.run_id,
        callbackUrl,
        title: `Workspace thread ${thread.title}`,
        context: {
          source: 'workspace_thread',
          workspace_id: workspaceId,
          actor_user_id: user.id,
          agent_id: parsed.data.agent_id ?? thread.agent_id ?? null,
          ai_use_case: parsed.data.ai_use_case,
          thread_id: thread.id,
          page_id: thread.entity_type === 'page' ? thread.entity_id : null,
          database_id: thread.entity_type === 'database' ? thread.entity_id : null,
          scope: {
            entity_type: thread.entity_type,
            entity_id: thread.entity_id,
          },
          additional_context: parsed.data.additional_context ?? {},
        },
      })

      await mergeRunTrace(accessClient as any, prepared.run_id, {
        openclaw: {
          correlation_id: dispatchResult.correlationId,
          gateway_run_id: dispatchResult.runId,
          agent_id: parsed.data.agent_id ?? thread.agent_id ?? null,
          status: dispatchResult.status,
          last_event_at: new Date().toISOString(),
          dispatch_kind: 'workspace_thread',
        },
      })

      return mergeAuthResponse(
        successResponse({
          thread,
          run_id: prepared.run_id,
          job_id: jobId,
          user_message: prepared.user_message,
          assistant_message: prepared.assistant_message,
        }, undefined, 201),
        authResponse,
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : 'OpenClaw dispatch failed'

      await accessClient
        .from('agent_thread_messages')
        .update({
          status: 'failed',
          content: message,
          metadata: {
            ...prepared.assistant_message.metadata,
            dispatch_error: message,
          },
        })
        .eq('id', prepared.assistant_message.id)

      await mergeRunTrace(accessClient as any, prepared.run_id, {
        openclaw: {
          correlation_id: prepared.run_id,
          status: 'failed',
          last_error: message,
          last_event_at: new Date().toISOString(),
          dispatch_kind: 'workspace_thread',
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

      return mergeAuthResponse(databaseErrorResponse('Failed to dispatch workspace thread run', message), authResponse)
    }
  } catch (error) {
    return mergeAuthResponse(
      databaseErrorResponse('Failed to create thread message', error instanceof Error ? error.message : error),
      authResponse,
    )
  }
}
