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

const automationSchema = z.object({
  name: z.string().trim().min(1).max(160),
  description: z.string().max(2000).nullable().optional(),
  trigger_type: z.enum(['manual', 'schedule', 'page_updated', 'database_row_updated', 'workspace_event']),
  event_name: z.string().max(160).nullable().optional(),
  schedule: z.string().max(120).nullable().optional(),
  entity_type: z.enum(['workspace', 'page', 'database']).optional(),
  entity_id: z.string().uuid().nullable().optional(),
  prompt: z.string().trim().min(1).max(12000),
  agent_id: z.string().min(1).max(200).nullable().optional(),
  writeback_mode: z.string().max(120).nullable().optional(),
  enabled: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: workspaceId } = await params
  if (!isValidUUID(workspaceId)) return invalidUUIDResponse('workspaceId', workspaceId)

  const contextResult = await getWorkspaceAgentRouteContext(request, workspaceId)
  if (!contextResult.ok) return contextResult.response

  const {
    context: { authResponse, accessClient },
  } = contextResult

  try {
    const url = new URL(request.url)
    const entityTypeParam = url.searchParams.get('entity_type')
    const entityType = entityTypeParam === 'workspace' || entityTypeParam === 'page' || entityTypeParam === 'database'
      ? entityTypeParam
      : undefined
    const entityId = url.searchParams.get('entity_id')

    if (entityId && !isValidUUID(entityId)) {
      return mergeAuthResponse(validationFailedResponse('entity_id must be a valid UUID'), authResponse)
    }

    const studio = new WorkspaceAgentStudioService(accessClient)
    const automations = await studio.listAutomations(workspaceId, {
      entityType,
      entityId: entityType ? (entityId ?? undefined) : undefined,
      limit: url.searchParams.get('limit') ? Number(url.searchParams.get('limit')) : undefined,
    })
    return mergeAuthResponse(successResponse({ automations, count: automations.length }), authResponse)
  } catch (error) {
    return mergeAuthResponse(
      databaseErrorResponse('Failed to fetch workspace automations', error instanceof Error ? error.message : error),
      authResponse,
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: workspaceId } = await params
  if (!isValidUUID(workspaceId)) return invalidUUIDResponse('workspaceId', workspaceId)

  const contextResult = await getWorkspaceAgentRouteContext(request, workspaceId, 'admin')
  if (!contextResult.ok) return contextResult.response

  const {
    context: { authResponse, accessClient, user },
  } = contextResult

  try {
    const body = await request.json().catch(() => null)
    const parsed = automationSchema.safeParse(body)
    if (!parsed.success) {
      return mergeAuthResponse(validationFailedResponse('Invalid automation payload', parsed.error.flatten()), authResponse)
    }

    const studio = new WorkspaceAgentStudioService(accessClient)
    const automation = await studio.createAutomation(workspaceId, user.id, parsed.data)
    return mergeAuthResponse(successResponse({ automation }, undefined, 201), authResponse)
  } catch (error) {
    return mergeAuthResponse(
      databaseErrorResponse('Failed to create workspace automation', error instanceof Error ? error.message : error),
      authResponse,
    )
  }
}
