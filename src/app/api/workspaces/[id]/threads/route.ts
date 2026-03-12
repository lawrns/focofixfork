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

const createThreadSchema = z.object({
  entity_type: z.enum(['workspace', 'page', 'database']),
  entity_id: z.string().uuid().nullable().optional(),
  title: z.string().trim().min(1).max(200),
  agent_id: z.string().min(1).max(200).nullable().optional(),
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
    const entityIdParam = url.searchParams.get('entity_id')
    const entityType = entityTypeParam === 'workspace' || entityTypeParam === 'page' || entityTypeParam === 'database'
      ? entityTypeParam
      : undefined

    if (entityIdParam && !isValidUUID(entityIdParam)) {
      return mergeAuthResponse(validationFailedResponse('entity_id must be a valid UUID'), authResponse)
    }

    const studio = new WorkspaceAgentStudioService(accessClient)
    const threads = await studio.listThreads(workspaceId, {
      entityType,
      entityId: entityType ? (entityIdParam === null ? null : entityIdParam ?? undefined) : undefined,
      limit: url.searchParams.get('limit') ? Number(url.searchParams.get('limit')) : undefined,
    })

    return mergeAuthResponse(successResponse({ threads, count: threads.length }), authResponse)
  } catch (error) {
    return mergeAuthResponse(
      databaseErrorResponse('Failed to fetch workspace threads', error instanceof Error ? error.message : error),
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

  const contextResult = await getWorkspaceAgentRouteContext(request, workspaceId)
  if (!contextResult.ok) return contextResult.response

  const {
    context: { authResponse, accessClient, user },
  } = contextResult

  try {
    const body = await request.json().catch(() => null)
    const parsed = createThreadSchema.safeParse(body)
    if (!parsed.success) {
      return mergeAuthResponse(validationFailedResponse('Invalid thread payload', parsed.error.flatten()), authResponse)
    }

    const studio = new WorkspaceAgentStudioService(accessClient)
    const thread = await studio.createThread(workspaceId, user.id, parsed.data)
    return mergeAuthResponse(successResponse({ thread }, undefined, 201), authResponse)
  } catch (error) {
    return mergeAuthResponse(
      databaseErrorResponse('Failed to create workspace thread', error instanceof Error ? error.message : error),
      authResponse,
    )
  }
}
