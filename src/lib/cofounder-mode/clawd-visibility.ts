import type { SupabaseClient } from '@supabase/supabase-js'

interface LogClawdActionInput {
  userId: string
  workspaceId?: string | null
  eventType: string
  title: string
  detail?: string | null
  payload?: Record<string, unknown>
  contextId?: string | null
}

export async function logClawdActionVisibility(
  supabase: SupabaseClient,
  input: LogClawdActionInput
): Promise<void> {
  const payload = {
    ...(input.payload ?? {}),
    source: 'clawdbot',
  }

  await Promise.allSettled([
    supabase.from('cofounder_decisions_history').insert({
      user_id: input.userId,
      workspace_id: input.workspaceId ?? null,
      event_type: input.eventType,
      severity: 'info',
      title: input.title,
      detail: input.detail ?? null,
      payload,
    }),
    supabase.from('ledger_events').insert({
      type: input.eventType,
      source: 'clawdbot',
      context_id: input.contextId ?? null,
      workspace_id: input.workspaceId ?? null,
      user_id: input.userId,
      payload,
    }),
  ])
}
