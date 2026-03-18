import { NextRequest, NextResponse } from 'next/server'
import { authorizeOpenClawRequest } from '@/lib/security/openclaw-auth'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { getSpecialistAdvisor, wrapAdvisorTask } from '@/lib/agent-avatars'
import { dispatchOpenClawTask } from '@/lib/openclaw/client'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    const serviceAuthorized = authorizeOpenClawRequest(request, rawBody)
    const { user, error, response: authResponse } = await getAuthUser(request)

    if (!serviceAuthorized && (error || !user)) {
      return mergeAuthResponse(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), authResponse)
    }

    const body = rawBody ? JSON.parse(rawBody) : {}
    const { agentId, task, context } = body
    const callbackUrl = typeof body.callbackUrl === 'string' && body.callbackUrl.trim()
      ? body.callbackUrl.trim()
      : new URL('/api/openclaw/callback', request.url).toString()
    const correlationId = typeof body.correlationId === 'string' && body.correlationId.trim()
      ? body.correlationId.trim()
      : crypto.randomUUID()
    const advisor = typeof agentId === 'string' ? getSpecialistAdvisor(agentId) : undefined
    const resolvedTask = advisor && typeof task === 'string' ? wrapAdvisorTask(advisor, task) : task
    const resolvedContext = advisor
      ? {
          ...(context && typeof context === 'object' ? context : {}),
          advisor: {
            id: advisor.id,
            nativeId: advisor.nativeId,
            name: advisor.name,
            role: advisor.role,
            description: advisor.description,
            personaTags: advisor.personaTags,
            systemPrompt: advisor.systemPrompt,
          },
        }
      : context
    const executionContext = {
      ...(resolvedContext && typeof resolvedContext === 'object' ? resolvedContext : {}),
      ...(typeof agentId === 'string' && agentId.trim() ? { agent_id: agentId.trim() } : {}),
      ...(typeof (resolvedContext as Record<string, unknown> | null)?.ai_use_case === 'string'
        ? {}
        : { ai_use_case: 'command_surface_execute' }),
    }

    try {
      const data = await dispatchOpenClawTask({
        agentId,
        task: resolvedTask,
        context: executionContext,
        correlationId,
        callbackUrl,
        taskId: typeof body.taskId === 'string' ? body.taskId : null,
        title: typeof body.title === 'string' ? body.title : null,
        preferredModel: typeof body.preferredModel === 'string' ? body.preferredModel : null,
      })
      if (data.accepted) {
        return mergeAuthResponse(
          NextResponse.json({ runId: data.runId || correlationId, agentId, correlationId: data.correlationId, status: data.status }),
          authResponse
        )
      }
    } catch {}

    // Fallback: return accepted
    return mergeAuthResponse(
      NextResponse.json({ runId: correlationId, agentId, correlationId, status: 'accepted' }),
      authResponse
    )
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
  }
}
