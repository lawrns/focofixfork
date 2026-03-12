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
import { WORKSPACE_DATABASE_PROPERTY_TYPES } from '@/lib/workspace-agent/service'

export const dynamic = 'force-dynamic'

const propertySchema = z.object({
  id: z.string().min(1).max(120).optional(),
  name: z.string().trim().min(1).max(120),
  type: z.enum(WORKSPACE_DATABASE_PROPERTY_TYPES),
  options: z.array(z.string()).optional(),
  config: z.record(z.unknown()).optional(),
})

const createDatabaseSchema = z.object({
  parent_doc_id: z.string().uuid().nullable().optional(),
  title: z.string().trim().min(1).max(200),
  description: z.string().max(2000).nullable().optional(),
  schema: z.array(propertySchema).min(1),
  default_view: z.record(z.unknown()).optional(),
})

function parseBoolean(value: string | null): boolean {
  return value === 'true'
}

function normalizeSchema(
  schema: Array<z.infer<typeof propertySchema>>
){
  return schema.map((property) => ({
    ...property,
    id: property.id ?? crypto.randomUUID(),
    options: property.options ?? [],
    config: property.config ?? {},
  }))
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
    const databases = await service.listDatabases(workspaceId, {
      parentDocId: url.searchParams.get('parent_doc_id'),
      includeArchived: parseBoolean(url.searchParams.get('include_archived')),
      limit: url.searchParams.get('limit') ? Number(url.searchParams.get('limit')) : undefined,
    })
    return mergeAuthResponse(successResponse({ databases, count: databases.length }), authResponse)
  } catch (error) {
    return mergeAuthResponse(
      databaseErrorResponse('Failed to fetch workspace databases', error instanceof Error ? error.message : error),
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
    const parsed = createDatabaseSchema.safeParse(body)
    if (!parsed.success) {
      return mergeAuthResponse(
        validationFailedResponse('Invalid workspace database payload', parsed.error.flatten()),
        authResponse
      )
    }

    const state = await service.createDatabase(workspaceId, user.id, {
      ...parsed.data,
      schema: normalizeSchema(parsed.data.schema),
    })
    return mergeAuthResponse(successResponse(state, undefined, 201), authResponse)
  } catch (error) {
    return mergeAuthResponse(
      databaseErrorResponse('Failed to create workspace database', error instanceof Error ? error.message : error),
      authResponse
    )
  }
}
