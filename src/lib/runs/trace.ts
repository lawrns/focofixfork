import type { SupabaseClient } from '@supabase/supabase-js'

export type RunTraceRecord = Record<string, unknown>

export type CommandSurfaceStreamState = 'queued' | 'resolving' | 'live' | 'ended' | 'unavailable' | 'error'

export type CommandSurfaceRunTrace = {
  job_id?: string | null
  stream_state?: CommandSurfaceStreamState | null
  last_stream_event_at?: string | null
  last_error?: string | null
  last_summary?: string | null
}

export type OpenClawRunTrace = {
  correlation_id?: string | null
  gateway_run_id?: string | null
  agent_id?: string | null
  status?: string | null
  model?: string | null
  last_event_at?: string | null
  last_error?: string | null
  last_summary?: string | null
  dispatch_kind?: string | null
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function deepMerge(base: Record<string, unknown>, patch: Record<string, unknown>): Record<string, unknown> {
  const next: Record<string, unknown> = { ...base }

  for (const [key, value] of Object.entries(patch)) {
    if (isPlainRecord(value) && isPlainRecord(base[key])) {
      next[key] = deepMerge(base[key] as Record<string, unknown>, value)
      continue
    }
    next[key] = value
  }

  return next
}

export function normalizeRunTrace(trace: unknown): RunTraceRecord {
  return isPlainRecord(trace) ? { ...trace } : {}
}

export function readCommandSurfaceTrace(trace: unknown): CommandSurfaceRunTrace {
  const normalized = normalizeRunTrace(trace)
  const commandSurface = isPlainRecord(normalized.command_surface) ? normalized.command_surface : {}

  return {
    job_id: typeof commandSurface.job_id === 'string' ? commandSurface.job_id : null,
    stream_state: typeof commandSurface.stream_state === 'string'
      ? (commandSurface.stream_state as CommandSurfaceStreamState)
      : null,
    last_stream_event_at: typeof commandSurface.last_stream_event_at === 'string' ? commandSurface.last_stream_event_at : null,
    last_error: typeof commandSurface.last_error === 'string' ? commandSurface.last_error : null,
    last_summary: typeof commandSurface.last_summary === 'string' ? commandSurface.last_summary : null,
  }
}

export function readOpenClawTrace(trace: unknown): OpenClawRunTrace {
  const normalized = normalizeRunTrace(trace)
  const openclaw = isPlainRecord(normalized.openclaw) ? normalized.openclaw : {}

  return {
    correlation_id: typeof openclaw.correlation_id === 'string' ? openclaw.correlation_id : null,
    gateway_run_id: typeof openclaw.gateway_run_id === 'string' ? openclaw.gateway_run_id : null,
    agent_id: typeof openclaw.agent_id === 'string' ? openclaw.agent_id : null,
    status: typeof openclaw.status === 'string' ? openclaw.status : null,
    model: typeof openclaw.model === 'string' ? openclaw.model : null,
    last_event_at: typeof openclaw.last_event_at === 'string' ? openclaw.last_event_at : null,
    last_error: typeof openclaw.last_error === 'string' ? openclaw.last_error : null,
    last_summary: typeof openclaw.last_summary === 'string' ? openclaw.last_summary : null,
    dispatch_kind: typeof openclaw.dispatch_kind === 'string' ? openclaw.dispatch_kind : null,
  }
}

export async function mergeRunTrace(
  supabase: SupabaseClient<any, any, any>,
  runId: string,
  tracePatch: Record<string, unknown>,
  updatePatch: Record<string, unknown> = {},
): Promise<void> {
  const { data: existing } = await supabase
    .from('runs')
    .select('trace')
    .eq('id', runId)
    .single()

  const nextTrace = deepMerge(normalizeRunTrace(existing?.trace), tracePatch)

  await supabase
    .from('runs')
    .update({
      ...updatePatch,
      trace: nextTrace,
    })
    .eq('id', runId)
}
