import { NextRequest } from 'next/server'
import { z } from 'zod'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import {
  authRequiredResponse,
  databaseErrorResponse,
  successResponse,
  validationFailedResponse,
} from '@/lib/api/response-helpers'
import { verifyWorkspaceMembership } from '@/lib/cofounder-mode/config-resolver'
import { appendDecisionMirror } from '@/lib/agent-ops/markdown-sync'
import { logClawdActionVisibility } from '@/lib/cofounder-mode/clawd-visibility'
import type { AgentOpsDecisionRow } from '@/lib/agent-ops/types'

export const dynamic = 'force-dynamic'

const createDecisionSchema = z.object({
  workspace_id: z.string().uuid().optional().nullable(),
  task_id: z.string().uuid().optional().nullable(),
  title: z.string().min(3).max(180),
  decision: z.string().min(3).max(1000),
  rationale: z.string().min(5).max(4000),
})

function parseLimit(req: NextRequest): number {
  const raw = Number(new URL(req.url).searchParams.get('limit') ?? 50)
  if (!Number.isFinite(raw)) return 50
  return Math.max(1, Math.min(100, Math.floor(raw)))
}

export async function GET(req: NextRequest) {
  const { user, supabase, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  const workspaceId = new URL(req.url).searchParams.get('workspace_id')
  const limit = parseLimit(req)
  let query = supabase
    .from('agent_ops_decisions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (workspaceId) {
    const isMember = await verifyWorkspaceMembership(supabase, user.id, workspaceId)
    if (!isMember) {
      return mergeAuthResponse(validationFailedResponse('Workspace access denied'), authResponse)
    }
    query = query.eq('workspace_id', workspaceId)
  }

  const { data, error: queryError } = await query.returns<AgentOpsDecisionRow[]>()
  if (queryError) {
    return mergeAuthResponse(databaseErrorResponse('Failed to load decisions', queryError.message), authResponse)
  }

  return mergeAuthResponse(successResponse({ items: data ?? [] }), authResponse)
}

export async function POST(req: NextRequest) {
  const { user, supabase, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  const body = await req.json().catch(() => null)
  const parsed = createDecisionSchema.safeParse(body)
  if (!parsed.success) {
    return mergeAuthResponse(validationFailedResponse('Invalid decision payload', parsed.error.flatten()), authResponse)
  }

  const input = parsed.data
  if (input.workspace_id) {
    const isMember = await verifyWorkspaceMembership(supabase, user.id, input.workspace_id)
    if (!isMember) {
      return mergeAuthResponse(validationFailedResponse('Workspace access denied'), authResponse)
    }
  }

  const { data, error: insertError } = await supabase
    .from('agent_ops_decisions')
    .insert({
      user_id: user.id,
      workspace_id: input.workspace_id ?? null,
      task_id: input.task_id ?? null,
      title: input.title.trim(),
      decision: input.decision.trim(),
      rationale: input.rationale.trim(),
    })
    .select('*')
    .single<AgentOpsDecisionRow>()

  if (insertError) {
    return mergeAuthResponse(databaseErrorResponse('Failed to create decision', insertError.message), authResponse)
  }

  await Promise.allSettled([
    appendDecisionMirror({
      id: data.id,
      title: data.title,
      decision: data.decision,
      rationale: data.rationale,
      taskId: data.task_id,
    }),
    logClawdActionVisibility(supabase, {
      userId: user.id,
      workspaceId: data.workspace_id,
      eventType: 'agent_ops_decision_logged',
      title: data.title,
      detail: data.decision,
      payload: {
        decision_id: data.id,
        task_id: data.task_id,
      },
      contextId: data.id,
    }),
  ])

  return mergeAuthResponse(successResponse({ item: data }, undefined, 201), authResponse)
}
