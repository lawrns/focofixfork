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

const updatePageSchema = z.object({
  title: z.string().trim().min(1).max(500).optional(),
  parent_id: z.string().uuid().nullable().optional(),
  project_id: z.string().uuid().nullable().optional(),
  template: z.string().max(120).nullable().optional(),
  metadata: z.record(z.unknown()).optional(),
})

function parseBoolean(value: string | null): boolean {
  return value === 'true'
}

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
    const url = new URL(request.url)
    const state = await service.getPageState(workspaceId, pageId, {
      includeBlocks: parseBoolean(url.searchParams.get('include_blocks')) || !url.searchParams.has('include_blocks'),
      includeDatabases: parseBoolean(url.searchParams.get('include_databases')) || !url.searchParams.has('include_databases'),
      includeArchived: parseBoolean(url.searchParams.get('include_archived')),
    })

    if (!state) return mergeAuthResponse(notFoundResponse('Page', pageId), authResponse)
    return mergeAuthResponse(successResponse(state), authResponse)
  } catch (error) {
    return mergeAuthResponse(
      databaseErrorResponse('Failed to fetch workspace page', error instanceof Error ? error.message : error),
      authResponse
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; pageId: string }> }
) {
  const { id: workspaceId, pageId } = await params
  if (!isValidUUID(workspaceId)) return invalidUUIDResponse('workspaceId', workspaceId)
  if (!isValidUUID(pageId)) return invalidUUIDResponse('pageId', pageId)

  const contextResult = await getWorkspaceAgentRouteContext(request, workspaceId)
  if (!contextResult.ok) return contextResult.response

  const {
    context: { authResponse, service, user },
  } = contextResult

  try {
    const body = await request.json().catch(() => null)
    const parsed = updatePageSchema.safeParse(body)
    if (!parsed.success) {
      return mergeAuthResponse(
        validationFailedResponse('Invalid workspace page update payload', parsed.error.flatten()),
        authResponse
      )
    }

    const state = await service.updatePage(workspaceId, user.id, pageId, parsed.data)
    return mergeAuthResponse(successResponse(state), authResponse)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message === 'Page not found') {
      return mergeAuthResponse(notFoundResponse('Page', pageId), authResponse)
    }
    return mergeAuthResponse(databaseErrorResponse('Failed to update workspace page', message), authResponse)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; pageId: string }> }
) {
  const { id: workspaceId, pageId } = await params
  if (!isValidUUID(workspaceId)) return invalidUUIDResponse('workspaceId', workspaceId)
  if (!isValidUUID(pageId)) return invalidUUIDResponse('pageId', pageId)

  const contextResult = await getWorkspaceAgentRouteContext(request, workspaceId)
  if (!contextResult.ok) return contextResult.response

  const {
    context: { authResponse, service, user },
  } = contextResult

  try {
    await service.archivePage(workspaceId, user.id, pageId)
    return mergeAuthResponse(successResponse({ pageId, archived: true }), authResponse)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message === 'Page not found') {
      return mergeAuthResponse(notFoundResponse('Page', pageId), authResponse)
    }
    return mergeAuthResponse(databaseErrorResponse('Failed to archive workspace page', message), authResponse)
  }
}
