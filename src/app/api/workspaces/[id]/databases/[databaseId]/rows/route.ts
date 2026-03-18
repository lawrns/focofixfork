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

const createRowSchema = z.object({
  page_id: z.string().uuid().nullable().optional(),
  position: z.number().int().min(0).optional(),
  properties: z.record(z.unknown()),
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
    context: { authResponse, service, user },
  } = contextResult

  try {
    const body = await request.json().catch(() => null)
    const parsed = createRowSchema.safeParse(body)
    if (!parsed.success) {
      return mergeAuthResponse(
        validationFailedResponse('Invalid workspace database row payload', parsed.error.flatten()),
        authResponse
      )
    }

    const row = await service.createDatabaseRow(workspaceId, user.id, databaseId, parsed.data)
    return mergeAuthResponse(successResponse({ row }, undefined, 201), authResponse)
  } catch (error) {
    return mergeAuthResponse(
      databaseErrorResponse('Failed to create workspace database row', error instanceof Error ? error.message : error),
      authResponse
    )
  }
}
