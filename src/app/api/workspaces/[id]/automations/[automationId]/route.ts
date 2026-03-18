import { NextRequest } from 'next/server'
import { z } from 'zod'
import { mergeAuthResponse } from '@/lib/api/auth-helper'
import {
  databaseErrorResponse,
  invalidUUIDResponse,
  isValidUUID,
  successResponse,
  validationFailedResponse,
} from '@/lib/api/response-helpers'
import { getWorkspaceAgentRouteContext } from '@/lib/workspace-agent/api'
import { WorkspaceAgentStudioService } from '@/lib/workspace-agent/studio'

export const dynamic = 'force-dynamic'

const patchAutomationSchema = z.object({
  name: z.string().trim().min(1).max(160).optional(),
  description: z.string().max(2000).nullable().optional(),
  trigger_type: z.enum(['manual', 'schedule', 'page_updated', 'database_row_updated', 'workspace_event']).optional(),
  event_name: z.string().max(160).nullable().optional(),
  schedule: z.string().max(120).nullable().optional(),
  entity_type: z.enum(['workspace', 'page', 'database']).optional(),
  entity_id: z.string().uuid().nullable().optional(),
  prompt: z.string().trim().min(1).max(12000).optional(),
  agent_id: z.string().min(1).max(200).nullable().optional(),
  writeback_mode: z.string().max(120).nullable().optional(),
  enabled: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional(),
})

export async function PATCH(
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
    const parsed = patchAutomationSchema.safeParse(body)
    if (!parsed.success) {
      return mergeAuthResponse(validationFailedResponse('Invalid automation update payload', parsed.error.flatten()), authResponse)
    }

    const studio = new WorkspaceAgentStudioService(accessClient)
    const automation = await studio.updateAutomation(workspaceId, user.id, automationId, parsed.data)
    return mergeAuthResponse(successResponse({ automation }), authResponse)
  } catch (error) {
    return mergeAuthResponse(
      databaseErrorResponse('Failed to update workspace automation', error instanceof Error ? error.message : error),
      authResponse,
    )
  }
}

export async function DELETE(
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
    const studio = new WorkspaceAgentStudioService(accessClient)
    await studio.deleteAutomation(workspaceId, user.id, automationId)
    return mergeAuthResponse(successResponse({ automationId, deleted: true }), authResponse)
  } catch (error) {
    return mergeAuthResponse(
      databaseErrorResponse('Failed to delete workspace automation', error instanceof Error ? error.message : error),
      authResponse,
    )
  }
}
