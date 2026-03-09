import { NextRequest, NextResponse } from 'next/server'
import { authorizeAgentCallback } from '@/lib/security/agent-callback-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function forwardHeaders(req: NextRequest): HeadersInit {
  const authorization = req.headers.get('authorization')
  return authorization ? { authorization } : {}
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function toSummary(body: Record<string, unknown>): string | null {
  const candidates = [
    body.summary,
    body.error,
    body.output,
    asObject(body.payload).summary,
    asObject(body.payload).error,
  ]

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim()
    if (candidate && typeof candidate === 'object') return JSON.stringify(candidate)
  }

  return null
}

function toOpenClawEvent(body: Record<string, unknown>) {
  const status = typeof body.status === 'string' ? body.status.trim().toLowerCase() : 'completed'
  const summary = toSummary(body)

  return {
    type:
      status === 'failed' || status === 'error'
        ? 'openclaw.run.failed'
        : status === 'running' || status === 'started'
          ? 'openclaw.run.running'
          : 'openclaw.run.completed',
    source: 'openclaw_callback',
    correlation_id:
      typeof body.correlation_id === 'string' && body.correlation_id.trim()
        ? body.correlation_id.trim()
        : null,
    run_id:
      typeof body.run_id === 'string' && body.run_id.trim()
        ? body.run_id.trim()
        : null,
    payload: {
      status,
      summary,
      error: typeof body.error === 'string' ? body.error : null,
      model: typeof body.model === 'string' ? body.model : null,
      task_id: typeof body.task_id === 'string' ? body.task_id : null,
      output: body.output ?? null,
      tokens_in: typeof body.tokens_in === 'number' ? body.tokens_in : null,
      tokens_out: typeof body.tokens_out === 'number' ? body.tokens_out : null,
      completed_at: typeof body.completed_at === 'string' ? body.completed_at : null,
    },
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  if (!authorizeAgentCallback(req, rawBody)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown> = {}
  try {
    body = rawBody ? JSON.parse(rawBody) : {}
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON payload' }, { status: 400 })
  }

  const taskId = typeof body.task_id === 'string' ? body.task_id.trim() : ''
  const targetPath = taskId.startsWith('pipeline:')
    ? '/api/pipeline/callback'
    : '/api/openclaw/events'
  const payload = taskId.startsWith('pipeline:')
    ? rawBody
    : JSON.stringify(toOpenClawEvent(body))

  const response = await fetch(new URL(targetPath, req.url), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...forwardHeaders(req),
    },
    body: payload,
    cache: 'no-store',
  })

  const text = await response.text()
  return new NextResponse(text, {
    status: response.status,
    headers: {
      'Content-Type': response.headers.get('content-type') ?? 'application/json; charset=utf-8',
    },
  })
}
