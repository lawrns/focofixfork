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
import { WorkspaceAgentStudioService } from '@/lib/workspace-agent/studio'

export const dynamic = 'force-dynamic'

const connectorSchema = z.object({
  connector_id: z.string().uuid().optional(),
  provider: z.enum(['slack', 'mail', 'gmail']),
  label: z.string().trim().min(1).max(120),
  status: z.enum(['connected', 'paused', 'error', 'disconnected']).optional(),
  capabilities: z.array(z.string()).optional(),
  config: z.record(z.unknown()).optional(),
  last_error: z.string().nullable().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: workspaceId } = await params
  if (!isValidUUID(workspaceId)) return invalidUUIDResponse('workspaceId', workspaceId)

  const contextResult = await getWorkspaceAgentRouteContext(request, workspaceId)
  if (!contextResult.ok) return contextResult.response

  const {
    context: { authResponse, accessClient },
  } = contextResult

  try {
    const studio = new WorkspaceAgentStudioService(accessClient)
    const connectors = await studio.listConnectors(workspaceId)
    return mergeAuthResponse(successResponse({ connectors, count: connectors.length }), authResponse)
  } catch (error) {
    return mergeAuthResponse(
      databaseErrorResponse('Failed to fetch workspace connectors', error instanceof Error ? error.message : error),
      authResponse,
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: workspaceId } = await params
  if (!isValidUUID(workspaceId)) return invalidUUIDResponse('workspaceId', workspaceId)

  const contextResult = await getWorkspaceAgentRouteContext(request, workspaceId, 'admin')
  if (!contextResult.ok) return contextResult.response

  const {
    context: { authResponse, accessClient, user },
  } = contextResult

  try {
    const body = await request.json().catch(() => null)
    const parsed = connectorSchema.safeParse(body)
    if (!parsed.success) {
      return mergeAuthResponse(validationFailedResponse('Invalid connector payload', parsed.error.flatten()), authResponse)
    }

    const studio = new WorkspaceAgentStudioService(accessClient)
    const connector = await studio.upsertConnector(workspaceId, user.id, {
      connectorId: parsed.data.connector_id,
      provider: parsed.data.provider,
      label: parsed.data.label,
      status: parsed.data.status,
      capabilities: parsed.data.capabilities,
      config: parsed.data.config,
      last_error: parsed.data.last_error,
    })

    return mergeAuthResponse(successResponse({ connector }, undefined, 201), authResponse)
  } catch (error) {
    return mergeAuthResponse(
      databaseErrorResponse('Failed to save workspace connector', error instanceof Error ? error.message : error),
      authResponse,
    )
  }
}
