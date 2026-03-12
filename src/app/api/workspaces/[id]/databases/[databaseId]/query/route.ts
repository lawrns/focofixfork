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

export const dynamic = 'force-dynamic'

const querySchema = z.object({
  filters: z.array(z.object({
    property: z.string().min(1),
    operator: z.enum(['eq', 'contains', 'in', 'gt', 'gte', 'lt', 'lte', 'checked', 'before', 'after', 'is_empty', 'not_empty']),
    value: z.unknown().optional(),
  })).optional(),
  sorts: z.array(z.object({
    property: z.string().min(1),
    direction: z.enum(['asc', 'desc']).optional(),
  })).optional(),
  limit: z.number().int().min(1).max(200).optional(),
  offset: z.number().int().min(0).optional(),
  include_archived: z.boolean().optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; databaseId: string }> }
) {
  const { id: workspaceId, databaseId } = await params
  if (!isValidUUID(workspaceId)) return invalidUUIDResponse('workspaceId', workspaceId)
  if (!isValidUUID(databaseId)) return invalidUUIDResponse('databaseId', databaseId)

  const contextResult = await getWorkspaceAgentRouteContext(request, workspaceId)
  if (!contextResult.ok) return contextResult.response

  const {
    context: { authResponse, service },
  } = contextResult

  try {
    const body = await request.json().catch(() => null)
    const parsed = querySchema.safeParse(body)
    if (!parsed.success) {
      return mergeAuthResponse(
        validationFailedResponse('Invalid database query payload', parsed.error.flatten()),
        authResponse
      )
    }

    const result = await service.queryDatabase(workspaceId, databaseId, parsed.data)
    return mergeAuthResponse(successResponse(result), authResponse)
  } catch (error) {
    return mergeAuthResponse(
      databaseErrorResponse('Failed to query workspace database', error instanceof Error ? error.message : error),
      authResponse
    )
  }
}
