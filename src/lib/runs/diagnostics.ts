import { readCommandSurfaceTrace, normalizeRunTrace } from '@/lib/runs/trace'

export type RunTimelineLikeEvent = {
  title: string
  description?: string
  status?: string
  payload?: Record<string, unknown> | null
}

export type RoutingSnapshot = {
  requested?: {
    model?: string | null
    planner_model?: string | null
    executor_model?: string | null
    reviewer_model?: string | null
    fallback_chain?: string[] | null
  } | null
  actual?: {
    planner_model?: string | null
    executor_model?: string | null
    reviewer_model?: string | null
    planner_provider?: string | null
    executor_provider?: string | null
    reviewer_provider?: string | null
    fallback_chain?: string[] | null
  } | null
}

export type RunDiagnostics = {
  lastError: string
  suggestion: string
  retryHint: Record<string, unknown> | null
  retryLabel: string
  code: string
}

export function extractRoutingSnapshot(trace: unknown): RoutingSnapshot | null {
  const normalized = normalizeRunTrace(trace)
  const routing = normalized.ai_routing
  return routing && typeof routing === 'object' && !Array.isArray(routing)
    ? (routing as RoutingSnapshot)
    : null
}

function buildErrorCorpus(lastError: string, events: RunTimelineLikeEvent[]): string {
  return [
    lastError,
    ...events
      .filter((event) => event.status === 'failed')
      .map((event) => [
        event.description,
        event.title,
        event.payload ? JSON.stringify(event.payload) : '',
      ].filter(Boolean).join(' ')),
  ].join(' ')
}

export function getLastRunError(
  trace: unknown,
  summary: string | null,
  events: RunTimelineLikeEvent[] = [],
): string | null {
  const commandSurface = readCommandSurfaceTrace(trace)
  if (commandSurface.last_error) return commandSurface.last_error

  const failedEvent = [...events].reverse().find((event) => event.status === 'failed')
  if (failedEvent?.description) return failedEvent.description
  if (failedEvent?.title) return failedEvent.title

  const normalized = normalizeRunTrace(trace)
  if (typeof normalized.last_error === 'string' && normalized.last_error) return normalized.last_error
  if (summary) return summary
  return null
}

export function diagnoseRunFailure(args: {
  status: string
  summary: string | null
  trace: unknown
  events?: RunTimelineLikeEvent[]
}): RunDiagnostics | null {
  if (args.status !== 'failed') return null

  const routing = extractRoutingSnapshot(args.trace)
  const lastError = getLastRunError(args.trace, args.summary, args.events ?? [])
  if (!lastError) return null

  const corpus = buildErrorCorpus(lastError, args.events ?? [])
  const lower = corpus.toLowerCase()
  const fallbackModel = routing?.requested?.fallback_chain?.[0] ?? null

  if (/model.*not.?found|model.*does not exist/.test(lower)) {
    return fallbackModel
      ? {
          lastError,
          suggestion: `Requested model unavailable. Retry with fallback ${fallbackModel}.`,
          retryHint: { model_override: fallbackModel },
          retryLabel: 'Retry with fallback',
          code: 'model_unavailable',
        }
      : {
          lastError,
          suggestion: 'Requested model unavailable. Switch provider or choose a different model.',
          retryHint: null,
          retryLabel: 'Retry',
          code: 'model_unavailable',
        }
  }

  if (/429|rate.?limit/.test(lower)) {
    return {
      lastError,
      suggestion: 'Rate limited. Wait briefly or retry with a different provider.',
      retryHint: null,
      retryLabel: 'Retry',
      code: 'rate_limited',
    }
  }

  if (/500|502|503|504/.test(lower)) {
    const code = lower.match(/\b(500|502|503|504)\b/)?.[0] ?? '5xx'
    return {
      lastError,
      suggestion: `Backend error ${code}. Check service health and retry once the runtime is healthy.`,
      retryHint: null,
      retryLabel: 'Retry',
      code: 'backend_error',
    }
  }

  if (/ECONNREFUSED|fetch failed|ENOTFOUND/i.test(corpus)) {
    return {
      lastError,
      suggestion: 'Runtime unreachable. Verify the OpenClaw relay and dependent services are available.',
      retryHint: null,
      retryLabel: 'Retry',
      code: 'service_unreachable',
    }
  }

  if (/context.?length|token.?limit|max.?tokens/i.test(lower)) {
    return {
      lastError,
      suggestion: 'Context exceeded model limits. Split the task or use a larger model before retrying.',
      retryHint: null,
      retryLabel: 'Retry',
      code: 'context_limit',
    }
  }

  if (/timeout/.test(lower)) {
    return {
      lastError,
      suggestion: 'Execution timed out. Retry with a smaller scope or after reducing runtime load.',
      retryHint: null,
      retryLabel: 'Retry',
      code: 'timeout',
    }
  }

  if (/401|403|unauthorized/.test(lower)) {
    return {
      lastError,
      suggestion: 'Authentication failed. Verify API credentials and runtime auth configuration.',
      retryHint: null,
      retryLabel: 'Retry',
      code: 'auth',
    }
  }

  return {
    lastError,
    suggestion: 'Review the execution trace and runtime context, then retry once the blocking condition is clear.',
    retryHint: null,
    retryLabel: 'Retry',
    code: 'unknown',
  }
}
