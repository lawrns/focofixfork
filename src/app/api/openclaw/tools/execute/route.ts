import { NextRequest } from 'next/server'
import { databaseErrorResponse, forbiddenResponse, successResponse, validationFailedResponse } from '@/lib/api/response-helpers'
import { executeToolCall } from '@/lib/ai/tool-executor'
import { authorizeOpenClawRequest } from '@/lib/security/openclaw-auth'
import { normalizeAIUseCase, resolveOpenClawToolExecutionContext } from '@/lib/openclaw/tool-bridge'
import { supabaseAdmin } from '@/lib/supabase-server'

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
  const toolName = typeof body.tool === 'string' ? body.tool.trim() : ''
  const args = body.args && typeof body.args === 'object' && !Array.isArray(body.args)
    ? body.args as Record<string, unknown>
    : {}
  const agentId = typeof body.agent_id === 'string' ? body.agent_id : null
  const useCase = normalizeAIUseCase(body.use_case)
  const correlationId = typeof body.correlation_id === 'string' && body.correlation_id.trim()
    ? body.correlation_id.trim()
    : crypto.randomUUID()

  if (!workspaceId || !actorUserId || !toolName) {
    return validationFailedResponse('workspace_id, actor_user_id, and tool are required')
  }

  if (!supabaseAdmin) {
    return databaseErrorResponse('Supabase admin client unavailable')
  }

  try {
    const { aiPolicy, bridge } = await resolveOpenClawToolExecutionContext({
      workspaceId,
      actorUserId,
      useCase,
      agentId,
    })

    const result = await executeToolCall(toolName, args, {
      userId: actorUserId,
      workspaceId,
      aiPolicy,
      correlationId,
      supabase: supabaseAdmin,
      metadata: {
        source: 'openclaw_tool_bridge',
        agent_id: agentId,
        use_case: useCase,
      },
    })

    return successResponse({
      bridge,
      tool: toolName,
      correlation_id: correlationId,
      result,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message === 'Actor does not have access to this workspace') {
      return forbiddenResponse(message)
    }
    return databaseErrorResponse(`Failed to execute OpenClaw tool ${toolName}`, message)
  }
}
