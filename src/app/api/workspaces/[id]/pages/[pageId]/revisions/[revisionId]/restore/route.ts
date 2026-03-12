import { NextRequest } from 'next/server'
import { mergeAuthResponse } from '@/lib/api/auth-helper'
import {
  databaseErrorResponse,
  invalidUUIDResponse,
  isValidUUID,
  notFoundResponse,
  successResponse,
} from '@/lib/api/response-helpers'
import { getWorkspaceAgentRouteContext } from '@/lib/workspace-agent/api'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; pageId: string; revisionId: string }> }
) {
  const { id: workspaceId, pageId, revisionId } = await params
  if (!isValidUUID(workspaceId)) return invalidUUIDResponse('workspaceId', workspaceId)
  if (!isValidUUID(pageId)) return invalidUUIDResponse('pageId', pageId)
  if (!isValidUUID(revisionId)) return invalidUUIDResponse('revisionId', revisionId)

  const contextResult = await getWorkspaceAgentRouteContext(request, workspaceId)
  if (!contextResult.ok) return contextResult.response

  const {
    context: { authResponse, service, user },
  } = contextResult

  try {
    const state = await service.restorePageRevision(workspaceId, user.id, pageId, revisionId)
    return mergeAuthResponse(successResponse(state), authResponse)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message === 'Revision not found') {
      return mergeAuthResponse(notFoundResponse('Revision', revisionId), authResponse)
    }
    return mergeAuthResponse(databaseErrorResponse('Failed to restore page revision', message), authResponse)
  }
}
