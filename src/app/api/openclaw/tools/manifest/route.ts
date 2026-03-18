import { NextRequest } from 'next/server'
import { successResponse, validationFailedResponse, forbiddenResponse, databaseErrorResponse } from '@/lib/api/response-helpers'
import { authorizeOpenClawRequest } from '@/lib/security/openclaw-auth'
import { buildOpenClawBridgeManifest, normalizeAIUseCase, resolveOpenClawToolExecutionContext } from '@/lib/openclaw/tool-bridge'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  if (!authorizeOpenClawRequest(req, rawBody)) {
    return forbiddenResponse('OpenClaw service authentication required')
  }

  let body: Record<string, unknown> = {}
  try {
    body = rawBody ? JSON.parse(rawBody) : {}
  } catch {
    return validationFailedResponse('Invalid JSON body')
  }

  const workspaceId = typeof body.workspace_id === 'string' ? body.workspace_id : null
  const actorUserId = typeof body.actor_user_id === 'string' ? body.actor_user_id : null
  const agentId = typeof body.agent_id === 'string' ? body.agent_id : null
  const useCase = normalizeAIUseCase(body.use_case)

  if (!workspaceId || !actorUserId) {
    return validationFailedResponse('workspace_id and actor_user_id are required')
  }

  try {
    const { aiPolicy } = await resolveOpenClawToolExecutionContext({
      workspaceId,
      actorUserId,
      useCase,
      agentId,
    })

    return successResponse(buildOpenClawBridgeManifest({
      workspaceId,
      actorUserId,
      useCase,
      agentId,
      aiPolicy,
    }))
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message === 'Actor does not have access to this workspace') {
      return forbiddenResponse(message)
    }
    return databaseErrorResponse('Failed to build OpenClaw tool manifest', message)
  }
}
