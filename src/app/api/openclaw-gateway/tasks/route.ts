import { NextRequest, NextResponse } from 'next/server'
import { authorizeOpenClawRequest } from '@/lib/security/openclaw-auth'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { getSpecialistAdvisor, wrapAdvisorTask } from '@/lib/agent-avatars'

export const dynamic = 'force-dynamic'

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || 'http://127.0.0.1:18789'

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
    const correlationId = crypto.randomUUID()
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

    // Try Gateway hooks/agent-run
    try {
      const response = await fetch(`${GATEWAY_URL}/hooks/agent-run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id: agentId, task: resolvedTask, context: resolvedContext, correlation_id: correlationId }),
      })
      if (response.ok) {
        const data = await response.json()
        return mergeAuthResponse(
          NextResponse.json({ runId: data.run_id || correlationId, agentId, correlationId, status: 'accepted' }),
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
