import type { SupabaseClient } from '@supabase/supabase-js'
import { logClawdActionVisibility } from '@/lib/cofounder-mode/clawd-visibility'

export interface ClawdbotActivityEventInput {
  userId: string
  workspaceId?: string | null
  projectId?: string | null
  taskId?: string | null
  runId?: string | null
  agentKey?: string
  eventType: string
  title: string
  detail?: string | null
  severity?: 'info' | 'warning' | 'error'
  direction?: 'inbound' | 'outbound' | 'tool' | 'internal' | 'system'
  sessionKey?: string | null
  correlationId?: string | null
  source?: string
  payload?: Record<string, unknown>
  idempotencyKey?: string | null
}

export interface ClawdbotActivityRow {
  id: string
  user_id: string
  workspace_id: string | null
  project_id: string | null
  task_id: string | null
  run_id: string | null
  agent_backend: 'clawdbot'
  agent_key: string
  session_key: string | null
  correlation_id: string | null
  event_type: string
  severity: 'info' | 'warning' | 'error'
  direction: 'inbound' | 'outbound' | 'tool' | 'internal' | 'system'
  title: string
  detail: string | null
  source: string
  payload: Record<string, unknown>
  idempotency_key: string | null
  created_at: string
}

export async function recordClawdbotActivity(
  supabase: SupabaseClient,
  input: ClawdbotActivityEventInput
): Promise<{ row: ClawdbotActivityRow; idempotent: boolean }> {
  const idempotencyKey = input.idempotencyKey?.trim() || null

  if (idempotencyKey) {
    const { data: existing } = await supabase
      .from('agent_activity_events')
      .select('*')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle()

    if (existing) {
      return { row: existing as ClawdbotActivityRow, idempotent: true }
    }
  }

  const payload = {
    ...(input.payload ?? {}),
    agent_backend: 'clawdbot',
  }

  const insertPayload = {
    user_id: input.userId,
    workspace_id: input.workspaceId ?? null,
    project_id: input.projectId ?? null,
    task_id: input.taskId ?? null,
    run_id: input.runId ?? null,
    agent_backend: 'clawdbot',
    agent_key: input.agentKey ?? 'clawdbot',
    session_key: input.sessionKey ?? null,
    correlation_id: input.correlationId ?? null,
    event_type: input.eventType,
    severity: input.severity ?? 'info',
    direction: input.direction ?? 'internal',
    title: input.title,
    detail: input.detail ?? null,
    source: input.source ?? 'clawdbot_bridge',
    payload,
    idempotency_key: idempotencyKey,
  }

  const { data, error } = await supabase
    .from('agent_activity_events')
    .insert(insertPayload)
    .select('*')
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to write Clawdbot activity')
  }

  await Promise.allSettled([
    logClawdActionVisibility(supabase, {
      userId: input.userId,
      workspaceId: input.workspaceId ?? null,
      eventType: input.eventType,
      title: input.title,
      detail: input.detail ?? null,
      payload,
      contextId: input.taskId ?? input.runId ?? null,
    }),
  ])

  return { row: data as ClawdbotActivityRow, idempotent: false }
}
