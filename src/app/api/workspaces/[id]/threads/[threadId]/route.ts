import { NextRequest } from 'next/server'
import { z } from 'zod'
import { mergeAuthResponse } from '@/lib/api/auth-helper'
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

export const dynamic = 'force-dynamic'

const patchThreadSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  status: z.enum(['open', 'paused', 'closed']).optional(),
  agent_id: z.string().min(1).max(200).nullable().optional(),
  metadata: z.record(z.unknown()).optional(),
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
    const [thread, messages] = await Promise.all([
      studio.getThread(workspaceId, threadId),
      studio.listThreadMessages(workspaceId, threadId),
    ])

    if (!thread) return mergeAuthResponse(notFoundResponse('Thread', threadId), authResponse)
    return mergeAuthResponse(successResponse({ thread, messages }), authResponse)
  } catch (error) {
    return mergeAuthResponse(
      databaseErrorResponse('Failed to fetch workspace thread', error instanceof Error ? error.message : error),
      authResponse,
    )
  }
}

export async function PATCH(
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
    const parsed = patchThreadSchema.safeParse(body)
    if (!parsed.success) {
      return mergeAuthResponse(validationFailedResponse('Invalid thread update payload', parsed.error.flatten()), authResponse)
    }

    const studio = new WorkspaceAgentStudioService(accessClient)
    const thread = await studio.updateThread(workspaceId, user.id, threadId, parsed.data)
    return mergeAuthResponse(successResponse({ thread }), authResponse)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message === 'Thread not found') {
      return mergeAuthResponse(notFoundResponse('Thread', threadId), authResponse)
    }
    return mergeAuthResponse(databaseErrorResponse('Failed to update workspace thread', message), authResponse)
  }
}
