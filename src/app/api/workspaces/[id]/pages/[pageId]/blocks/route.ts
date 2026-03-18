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
import { WORKSPACE_BLOCK_TYPES } from '@/lib/workspace-agent/service'

export const dynamic = 'force-dynamic'

const blockInputSchema = z.object({
  id: z.string().uuid().optional(),
  parent_block_id: z.string().uuid().nullable().optional(),
  position: z.number().int().min(0).optional(),
  block_type: z.enum(WORKSPACE_BLOCK_TYPES),
  props: z.record(z.unknown()).optional(),
  plain_text: z.string().nullable().optional(),
})

const putBlocksSchema = z.object({
  mode: z.enum(['replace', 'append']).default('replace'),
  blocks: z.array(blockInputSchema),
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
    const state = await service.getPageState(workspaceId, pageId, {
      includeBlocks: true,
      includeDatabases: false,
      includeArchived: parseBoolean(new URL(request.url).searchParams.get('include_archived')),
    })
    if (!state) return mergeAuthResponse(notFoundResponse('Page', pageId), authResponse)

    return mergeAuthResponse(successResponse({ page: state.page, blocks: state.blocks }), authResponse)
  } catch (error) {
    return mergeAuthResponse(
      databaseErrorResponse('Failed to fetch workspace blocks', error instanceof Error ? error.message : error),
      authResponse
    )
  }
}

export async function PUT(
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
    const state = await service.getPageState(workspaceId, pageId, {
      includeBlocks: false,
      includeDatabases: false,
    })
    if (!state) return mergeAuthResponse(notFoundResponse('Page', pageId), authResponse)

    const body = await request.json().catch(() => null)
    const parsed = putBlocksSchema.safeParse(body)
    if (!parsed.success) {
      return mergeAuthResponse(
        validationFailedResponse('Invalid workspace block payload', parsed.error.flatten()),
        authResponse
      )
    }

    const blocks = parsed.data.mode === 'append'
      ? await service.appendBlocks(workspaceId, user.id, pageId, parsed.data.blocks)
      : await service.replaceBlocks(workspaceId, user.id, pageId, parsed.data.blocks)

    return mergeAuthResponse(successResponse({ page: state.page, blocks }), authResponse)
  } catch (error) {
    return mergeAuthResponse(
      databaseErrorResponse('Failed to save workspace blocks', error instanceof Error ? error.message : error),
      authResponse
    )
  }
}
