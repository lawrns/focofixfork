import { NextRequest } from 'next/server'
import { mergeAuthResponse } from '@/lib/api/auth-helper'
import {
  databaseErrorResponse,
  invalidUUIDResponse,
  isValidUUID,
  successResponse,
} from '@/lib/api/response-helpers'
import { getWorkspaceAgentRouteContext } from '@/lib/workspace-agent/api'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; pageId: string }> }
) {
  const { id: workspaceId, pageId } = await params
  if (!isValidUUID(workspaceId)) return invalidUUIDResponse('workspaceId', workspaceId)
  if (!isValidUUID(pageId)) return invalidUUIDResponse('pageId', pageId)

  const contextResult = await getWorkspaceAgentRouteContext(request, workspaceId)
  if (!contextResult.ok) return contextResult.response

  const {
    context: { authResponse, service },
  } = contextResult

  try {
    const revisions = await service.listRevisions(workspaceId, pageId)
    return mergeAuthResponse(successResponse({ revisions, count: revisions.length }), authResponse)
  } catch (error) {
    return mergeAuthResponse(
      databaseErrorResponse('Failed to fetch page revisions', error instanceof Error ? error.message : error),
      authResponse
    )
  }
}
