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
import { logClawdActionVisibility } from '@/lib/cofounder-mode/clawd-visibility'
import type { AgentOpsTaskRow } from '@/lib/agent-ops/types'

export const dynamic = 'force-dynamic'

const goSchema = z.object({
  task_id: z.string().uuid(),
})

function buildExecutionPrompt(task: AgentOpsTaskRow): string {
  const criteria = task.acceptance_criteria.length > 0
    ? task.acceptance_criteria.map((item, idx) => `${idx + 1}. ${item}`).join('\n')
    : '1. Complete objective faithfully.'

  return [
    `Lane: ${task.lane}`,
    `Task: ${task.title}`,
    '',
    `Objective: ${task.objective}`,
    '',
    'Acceptance Criteria:',
    criteria,
  ].join('\n')
}

export async function POST(req: NextRequest) {
  const { user, supabase, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  const body = await req.json().catch(() => null)
  const parsed = goSchema.safeParse(body)
  if (!parsed.success) {
    return mergeAuthResponse(validationFailedResponse('Invalid /go payload', parsed.error.flatten()), authResponse)
  }

  const { task_id: taskId } = parsed.data

  const { data: task, error: queryError } = await supabase
    .from('agent_ops_tasks')
    .select('*')
    .eq('id', taskId)
    .eq('user_id', user.id)
    .maybeSingle<AgentOpsTaskRow>()

  if (queryError) return mergeAuthResponse(databaseErrorResponse('Failed to load task', queryError.message), authResponse)
  if (!task) return mergeAuthResponse(notFoundResponse('Task', taskId), authResponse)
  if (task.status !== 'approved' && task.status !== 'in_progress') {
    return mergeAuthResponse(validationFailedResponse('Task must be approved before /go'), authResponse)
  }

  const { data: updated, error: updateError } = await supabase
    .from('agent_ops_tasks')
    .update({ status: 'in_progress' })
    .eq('id', task.id)
    .eq('user_id', user.id)
    .select('*')
    .single<AgentOpsTaskRow>()

  if (updateError) {
    return mergeAuthResponse(databaseErrorResponse('Failed to update task state', updateError.message), authResponse)
  }

  const suggestedBody = {
    prompt: buildExecutionPrompt(updated),
    mode: 'auto',
    project_id: updated.project_id,
    lane: updated.lane,
    task_id: updated.id,
  }

  await logClawdActionVisibility(supabase, {
    userId: user.id,
    workspaceId: updated.workspace_id,
    eventType: 'agent_ops_go_triggered',
    title: `Human-triggered /go: ${updated.title}`,
    detail: `lane=${updated.lane}`,
    payload: {
      task_id: updated.id,
      lane: updated.lane,
      status: updated.status,
      human_gate_step: 'approved_to_execute',
    },
    contextId: updated.id,
  })

  return mergeAuthResponse(successResponse({
    task: updated,
    next_action: {
      endpoint: '/api/command-surface/execute',
      method: 'POST',
      body: suggestedBody,
    },
  }), authResponse)
}
