import { NextRequest } from 'next/server'
import { mergeAuthResponse } from '@/lib/api/auth-helper'
import {
  badRequestResponse,
  databaseErrorResponse,
  invalidUUIDResponse,
  isValidUUID,
  successResponse,
} from '@/lib/api/response-helpers'
import { getWorkspaceAgentRouteContext } from '@/lib/workspace-agent/api'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: workspaceId } = await params
  if (!isValidUUID(workspaceId)) return invalidUUIDResponse('workspaceId', workspaceId)

  const contextResult = await getWorkspaceAgentRouteContext(request, workspaceId)
  if (!contextResult.ok) return contextResult.response

  const {
    context: { authResponse, service },
  } = contextResult

  try {
    const url = new URL(request.url)
    const query = url.searchParams.get('q')?.trim() ?? ''
    if (!query) {
      return mergeAuthResponse(badRequestResponse('q is required'), authResponse)
    }

    const entityTypes = url.searchParams.get('entity_types')
      ?.split(',')
      .map((value) => value.trim())
      .filter(Boolean)

    const results = await service.searchWorkspace(workspaceId, {
      query,
      entityTypes,
      limit: url.searchParams.get('limit') ? Number(url.searchParams.get('limit')) : undefined,
    })

    return mergeAuthResponse(successResponse({ query, results, count: results.length }), authResponse)
  } catch (error) {
    return mergeAuthResponse(
      databaseErrorResponse('Failed to search workspace', error instanceof Error ? error.message : error),
      authResponse
    )
  }
}
