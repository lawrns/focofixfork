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
import { WORKSPACE_DATABASE_PROPERTY_TYPES } from '@/lib/workspace-agent/service'

export const dynamic = 'force-dynamic'

const propertySchema = z.object({
  id: z.string().min(1).max(120),
  name: z.string().trim().min(1).max(120),
  type: z.enum(WORKSPACE_DATABASE_PROPERTY_TYPES),
  options: z.array(z.string()).optional(),
  config: z.record(z.unknown()).optional(),
})

const updateDatabaseSchema = z.object({
  parent_doc_id: z.string().uuid().nullable().optional(),
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  schema: z.array(propertySchema).min(1).optional(),
  default_view: z.record(z.unknown()).optional(),
})

function parseBoolean(value: string | null): boolean {
  return value === 'true'
}

export async function GET(
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
    const url = new URL(request.url)
    const state = await service.getDatabase(workspaceId, databaseId, {
      includeRows: parseBoolean(url.searchParams.get('include_rows')) || !url.searchParams.has('include_rows'),
      includeArchived: parseBoolean(url.searchParams.get('include_archived')),
    })
    if (!state) return mergeAuthResponse(notFoundResponse('Database', databaseId), authResponse)

    return mergeAuthResponse(successResponse(state), authResponse)
  } catch (error) {
    return mergeAuthResponse(
      databaseErrorResponse('Failed to fetch workspace database', error instanceof Error ? error.message : error),
      authResponse
    )
  }
}

export async function PATCH(
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
    const parsed = updateDatabaseSchema.safeParse(body)
    if (!parsed.success) {
      return mergeAuthResponse(
        validationFailedResponse('Invalid workspace database update payload', parsed.error.flatten()),
        authResponse
      )
    }

    const state = await service.updateDatabase(workspaceId, user.id, databaseId, parsed.data)
    return mergeAuthResponse(successResponse(state), authResponse)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message === 'Database not found') {
      return mergeAuthResponse(notFoundResponse('Database', databaseId), authResponse)
    }
    return mergeAuthResponse(databaseErrorResponse('Failed to update workspace database', message), authResponse)
  }
}

export async function DELETE(
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
    await service.archiveDatabase(workspaceId, user.id, databaseId)
    return mergeAuthResponse(successResponse({ databaseId, archived: true }), authResponse)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message === 'Database not found') {
      return mergeAuthResponse(notFoundResponse('Database', databaseId), authResponse)
    }
    return mergeAuthResponse(databaseErrorResponse('Failed to archive workspace database', message), authResponse)
  }
}
