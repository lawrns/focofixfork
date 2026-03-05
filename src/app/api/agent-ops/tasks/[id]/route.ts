import { NextRequest } from 'next/server'
import { z } from 'zod'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import {
  authRequiredResponse,
  databaseErrorResponse,
  notFoundResponse,
  successResponse,
  validationFailedResponse,
} from '@/lib/api/response-helpers'
import { verifyWorkspaceMembership } from '@/lib/cofounder-mode/config-resolver'
import { appendTaskMirror } from '@/lib/agent-ops/markdown-sync'
import { TASK_SIZES, TASK_STATUSES, type AgentOpsTaskRow } from '@/lib/agent-ops/types'
import { logClawdActionVisibility } from '@/lib/cofounder-mode/clawd-visibility'

export const dynamic = 'force-dynamic'

interface Params {
  params: Promise<{ id: string }>
}

const updateTaskSchema = z.object({
  title: z.string().min(3).max(180).optional(),
  objective: z.string().min(5).max(2000).optional(),
  acceptance_criteria: z.array(z.string().min(1).max(400)).max(10).optional(),
  size: z.enum(TASK_SIZES).optional(),
  status: z.enum(TASK_STATUSES).optional(),
  metadata: z.record(z.unknown()).optional(),
})

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params
  const { user, supabase, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  const body = await req.json().catch(() => null)
  const parsed = updateTaskSchema.safeParse(body)
  if (!parsed.success) {
    return mergeAuthResponse(validationFailedResponse('Invalid update payload', parsed.error.flatten()), authResponse)
  }

  const { data: existing, error: fetchError } = await supabase
    .from('agent_ops_tasks')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle<AgentOpsTaskRow>()

  if (fetchError) return mergeAuthResponse(databaseErrorResponse('Failed to load task', fetchError.message), authResponse)
  if (!existing) return mergeAuthResponse(notFoundResponse('Task', id), authResponse)

  if (existing.workspace_id) {
    const isMember = await verifyWorkspaceMembership(supabase, user.id, existing.workspace_id)
    if (!isMember) {
      return mergeAuthResponse(validationFailedResponse('Workspace access denied'), authResponse)
    }
  }

  const input = parsed.data
  const nextStatus = input.status ?? existing.status
  const patch: Record<string, unknown> = {
    ...input,
  }

  if (nextStatus === 'approved' && existing.status !== 'approved') {
    patch.approved_by = user.id
    patch.approved_at = new Date().toISOString()
  }

  const { data, error: updateError } = await supabase
    .from('agent_ops_tasks')
    .update(patch)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('*')
    .single<AgentOpsTaskRow>()

  if (updateError) {
    return mergeAuthResponse(databaseErrorResponse('Failed to update task', updateError.message), authResponse)
  }

  await Promise.allSettled([
    appendTaskMirror({
      id: data.id,
      lane: data.lane,
      title: data.title,
      objective: data.objective,
      acceptanceCriteria: data.acceptance_criteria,
      status: data.status,
    }),
    logClawdActionVisibility(supabase, {
      userId: user.id,
      workspaceId: data.workspace_id,
      eventType: 'agent_ops_task_updated',
      title: `Task updated: ${data.title}`,
      detail: `status=${data.status}`,
      payload: {
        task_id: data.id,
        lane: data.lane,
        status: data.status,
      },
      contextId: data.id,
    }),
  ])

  return mergeAuthResponse(successResponse({ item: data }), authResponse)
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { id } = await params
  const { user, supabase, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  const { data: existing, error: fetchError } = await supabase
    .from('agent_ops_tasks')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle<AgentOpsTaskRow>()

  if (fetchError) return mergeAuthResponse(databaseErrorResponse('Failed to load task', fetchError.message), authResponse)
  if (!existing) return mergeAuthResponse(successResponse({ ok: true, deleted: 0, not_found: true }), authResponse)

  const { data, error: updateError } = await supabase
    .from('agent_ops_tasks')
    .update({ status: 'archived' })
    .eq('id', id)
    .eq('user_id', user.id)
    .select('*')
    .single<AgentOpsTaskRow>()

  if (updateError) {
    return mergeAuthResponse(databaseErrorResponse('Failed to archive task', updateError.message), authResponse)
  }

  await Promise.allSettled([
    appendTaskMirror({
      id: data.id,
      lane: data.lane,
      title: data.title,
      objective: data.objective,
      acceptanceCriteria: data.acceptance_criteria,
      status: data.status,
    }),
    logClawdActionVisibility(supabase, {
      userId: user.id,
      workspaceId: data.workspace_id,
      eventType: 'agent_ops_task_archived',
      title: `Task archived: ${data.title}`,
      payload: {
        task_id: data.id,
        lane: data.lane,
      },
      contextId: data.id,
    }),
  ])

  return mergeAuthResponse(successResponse({ ok: true, deleted: 1, item: data }), authResponse)
}
