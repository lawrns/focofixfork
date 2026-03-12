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
import { WorkspaceAgentStudioService } from '@/lib/workspace-agent/studio'

export const dynamic = 'force-dynamic'

const patchConnectorSchema = z.object({
  provider: z.enum(['slack', 'mail', 'gmail']).optional(),
  label: z.string().trim().min(1).max(120).optional(),
  status: z.enum(['connected', 'paused', 'error', 'disconnected']).optional(),
  capabilities: z.array(z.string()).optional(),
  config: z.record(z.unknown()).optional(),
  last_error: z.string().nullable().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; connectorId: string }> },
) {
  const { id: workspaceId, connectorId } = await params
  if (!isValidUUID(workspaceId)) return invalidUUIDResponse('workspaceId', workspaceId)
  if (!isValidUUID(connectorId)) return invalidUUIDResponse('connectorId', connectorId)

  const contextResult = await getWorkspaceAgentRouteContext(request, workspaceId, 'admin')
  if (!contextResult.ok) return contextResult.response

  const {
    context: { authResponse, accessClient, user },
  } = contextResult

  try {
    const body = await request.json().catch(() => null)
    const parsed = patchConnectorSchema.safeParse(body)
    if (!parsed.success) {
      return mergeAuthResponse(validationFailedResponse('Invalid connector update payload', parsed.error.flatten()), authResponse)
    }

    const studio = new WorkspaceAgentStudioService(accessClient)
    const existing = await studio.getConnector(workspaceId, connectorId, { includeSecrets: true })
    if (!existing) return mergeAuthResponse(notFoundResponse('Connector', connectorId), authResponse)

    const connector = await studio.upsertConnector(workspaceId, user.id, {
      connectorId,
      provider: parsed.data.provider ?? existing.provider,
      label: parsed.data.label ?? existing.label,
      status: parsed.data.status ?? existing.status,
      capabilities: parsed.data.capabilities ?? existing.capabilities,
      config: parsed.data.config ? { ...existing.config, ...parsed.data.config } : existing.config,
      last_error: parsed.data.last_error ?? existing.last_error,
    })

    return mergeAuthResponse(successResponse({ connector }), authResponse)
  } catch (error) {
    return mergeAuthResponse(
      databaseErrorResponse('Failed to update workspace connector', error instanceof Error ? error.message : error),
      authResponse,
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; connectorId: string }> },
) {
  const { id: workspaceId, connectorId } = await params
  if (!isValidUUID(workspaceId)) return invalidUUIDResponse('workspaceId', workspaceId)
  if (!isValidUUID(connectorId)) return invalidUUIDResponse('connectorId', connectorId)

  const contextResult = await getWorkspaceAgentRouteContext(request, workspaceId, 'admin')
  if (!contextResult.ok) return contextResult.response

  const {
    context: { authResponse, accessClient, user },
  } = contextResult

  try {
    const studio = new WorkspaceAgentStudioService(accessClient)
    await studio.deleteConnector(workspaceId, user.id, connectorId)
    return mergeAuthResponse(successResponse({ connectorId, deleted: true }), authResponse)
  } catch (error) {
    return mergeAuthResponse(
      databaseErrorResponse('Failed to delete workspace connector', error instanceof Error ? error.message : error),
      authResponse,
    )
  }
}
