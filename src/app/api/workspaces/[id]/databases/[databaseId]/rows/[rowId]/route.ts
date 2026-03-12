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

export const dynamic = 'force-dynamic'

const updateRowSchema = z.object({
  page_id: z.string().uuid().nullable().optional(),
  position: z.number().int().min(0).optional(),
  properties: z.record(z.unknown()).optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; databaseId: string; rowId: string }> }
) {
  const { id: workspaceId, rowId, databaseId } = await params
  if (!isValidUUID(workspaceId)) return invalidUUIDResponse('workspaceId', workspaceId)
  if (!isValidUUID(databaseId)) return invalidUUIDResponse('databaseId', databaseId)
  if (!isValidUUID(rowId)) return invalidUUIDResponse('rowId', rowId)

  const contextResult = await getWorkspaceAgentRouteContext(request, workspaceId)
  if (!contextResult.ok) return contextResult.response

  const {
    context: { authResponse, service, user },
  } = contextResult

  try {
    const body = await request.json().catch(() => null)
    const parsed = updateRowSchema.safeParse(body)
    if (!parsed.success) {
      return mergeAuthResponse(
        validationFailedResponse('Invalid workspace database row update payload', parsed.error.flatten()),
        authResponse
      )
    }

    const row = await service.updateDatabaseRow(workspaceId, user.id, rowId, parsed.data)
    return mergeAuthResponse(successResponse({ row }), authResponse)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message === 'Database row not found') {
      return mergeAuthResponse(notFoundResponse('Database row', rowId), authResponse)
    }
    return mergeAuthResponse(databaseErrorResponse('Failed to update workspace database row', message), authResponse)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; databaseId: string; rowId: string }> }
) {
  const { id: workspaceId, rowId, databaseId } = await params
  if (!isValidUUID(workspaceId)) return invalidUUIDResponse('workspaceId', workspaceId)
  if (!isValidUUID(databaseId)) return invalidUUIDResponse('databaseId', databaseId)
  if (!isValidUUID(rowId)) return invalidUUIDResponse('rowId', rowId)

  const contextResult = await getWorkspaceAgentRouteContext(request, workspaceId)
  if (!contextResult.ok) return contextResult.response

  const {
    context: { authResponse, service, user },
  } = contextResult

  try {
    await service.archiveDatabaseRow(workspaceId, user.id, rowId)
    return mergeAuthResponse(successResponse({ rowId, archived: true }), authResponse)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message === 'Database row not found') {
      return mergeAuthResponse(notFoundResponse('Database row', rowId), authResponse)
    }
    return mergeAuthResponse(databaseErrorResponse('Failed to archive workspace database row', message), authResponse)
  }
}
