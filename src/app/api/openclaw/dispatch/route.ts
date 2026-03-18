import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { authRequiredResponse, badRequestResponse } from '@/lib/api/response-helpers'
import { dispatchOpenClawTask } from '@/lib/openclaw/client'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const { user, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  const body = await req.json().catch(() => ({} as Record<string, unknown>))
  const task = typeof body.task === 'string' ? body.task.trim() : ''
  const agentId = typeof body.agentId === 'string' && body.agentId.trim() ? body.agentId.trim() : 'cofounder'

  if (!task) {
    return mergeAuthResponse(badRequestResponse('task is required'), authResponse)
  }

  const context = body.context && typeof body.context === 'object' && !Array.isArray(body.context)
    ? body.context as Record<string, unknown>
    : {}
  const callbackUrl = typeof body.callbackUrl === 'string' && body.callbackUrl.trim()
    ? body.callbackUrl.trim()
    : new URL('/api/openclaw/callback', req.url).toString()

  const result = await dispatchOpenClawTask({
    agentId,
    task,
    taskId: typeof body.taskId === 'string' ? body.taskId : null,
    title: typeof body.title === 'string' ? body.title : null,
    callbackUrl,
    preferredModel: typeof body.preferredModel === 'string' ? body.preferredModel : null,
    context: {
      ...context,
      dispatch_source: typeof body.source === 'string' ? body.source : 'focofixfork',
      actor_user_id: user.id,
      agent_id: agentId,
      ai_use_case: typeof context.ai_use_case === 'string' ? context.ai_use_case : 'command_surface_execute',
    },
    correlationId: typeof body.correlationId === 'string' ? body.correlationId : null,
  })

  return mergeAuthResponse(NextResponse.json({ data: result }), authResponse)
}
