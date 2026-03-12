import { NextRequest } from 'next/server'
import { z } from 'zod'
import { mergeAuthResponse } from '@/lib/api/auth-helper'
import {
  badRequestResponse,
  databaseErrorResponse,
  invalidUUIDResponse,
  isValidUUID,
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

const createPageSchema = z.object({
  title: z.string().trim().min(1).max(500),
  parent_id: z.string().uuid().nullable().optional(),
  project_id: z.string().uuid().nullable().optional(),
  template: z.string().max(120).nullable().optional(),
  metadata: z.record(z.unknown()).optional(),
  blocks: z.array(blockInputSchema).optional(),
})

function parseBoolean(value: string | null): boolean {
  return value === 'true'
}

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
    const pages = await service.listPages(workspaceId, {
      projectId: url.searchParams.get('project_id'),
      parentId: url.searchParams.get('parent_id'),
      includeArchived: parseBoolean(url.searchParams.get('include_archived')),
      limit: url.searchParams.get('limit') ? Number(url.searchParams.get('limit')) : undefined,
    })

    return mergeAuthResponse(successResponse({ pages, count: pages.length }), authResponse)
  } catch (error) {
    return mergeAuthResponse(
      databaseErrorResponse('Failed to fetch workspace pages', error instanceof Error ? error.message : error),
      authResponse
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: workspaceId } = await params
  if (!isValidUUID(workspaceId)) return invalidUUIDResponse('workspaceId', workspaceId)

  const contextResult = await getWorkspaceAgentRouteContext(request, workspaceId)
  if (!contextResult.ok) return contextResult.response

  const {
    context: { authResponse, service, user },
  } = contextResult

  try {
    const body = await request.json().catch(() => null)
    const parsed = createPageSchema.safeParse(body)
    if (!parsed.success) {
      return mergeAuthResponse(
        validationFailedResponse('Invalid workspace page payload', parsed.error.flatten()),
        authResponse
      )
    }

    if (parsed.data.parent_id && parsed.data.parent_id === parsed.data.project_id) {
      return mergeAuthResponse(
        badRequestResponse('parent_id and project_id must refer to different resources'),
        authResponse
      )
    }

    const state = await service.createPage(workspaceId, user.id, parsed.data)
    return mergeAuthResponse(successResponse(state, undefined, 201), authResponse)
  } catch (error) {
    return mergeAuthResponse(
      databaseErrorResponse('Failed to create workspace page', error instanceof Error ? error.message : error),
      authResponse
    )
  }
}
