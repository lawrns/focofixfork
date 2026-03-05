import { NextRequest } from 'next/server'
import {
  authRequiredResponse,
  databaseErrorResponse,
  successResponse,
  validationFailedResponse,
} from '@/lib/api/response-helpers'
import { supabaseAdmin } from '@/lib/supabase-server'
import { authorizeOpenClawRequest } from '@/lib/security/openclaw-auth'

export const dynamic = 'force-dynamic'

type Severity = 'info' | 'warning' | 'error'

interface ParsedInput {
  userId: string
  workspaceId: string | null
  eventType: string
  title: string
  detail: string | null
  severity: Severity
  payload: Record<string, unknown>
  contextId: string | null
}

function normalizeSeverity(value: unknown): Severity {
  if (value === 'warning' || value === 'error') return value
  return 'info'
}

function parseBody(body: Record<string, unknown>): ParsedInput | null {
  const userId = typeof body.user_id === 'string'
    ? body.user_id.trim()
    : typeof body.userId === 'string'
      ? body.userId.trim()
      : ''

  if (!userId) return null

  const workspaceId = typeof body.workspace_id === 'string'
    ? body.workspace_id
    : typeof body.workspaceId === 'string'
      ? body.workspaceId
      : null

  const eventTypeRaw = typeof body.event_type === 'string'
    ? body.event_type
    : typeof body.eventType === 'string'
      ? body.eventType
      : 'clawd_action'

  const eventType = eventTypeRaw.trim().length > 0 ? eventTypeRaw.trim() : 'clawd_action'
  const title = typeof body.title === 'string' && body.title.trim().length > 0
    ? body.title.trim()
    : `Clawd action: ${eventType}`

  const detail = typeof body.detail === 'string' && body.detail.trim().length > 0
    ? body.detail.trim()
    : null

  const contextId = typeof body.context_id === 'string'
    ? body.context_id
    : typeof body.contextId === 'string'
      ? body.contextId
      : null

  const payload = body.payload && typeof body.payload === 'object'
    ? body.payload as Record<string, unknown>
    : {}

  return {
    userId,
    workspaceId,
    eventType,
    title,
    detail,
    severity: normalizeSeverity(body.severity),
    payload,
    contextId,
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  if (!authorizeOpenClawRequest(req, rawBody)) {
    return authRequiredResponse('OpenClaw service authentication required')
  }

  if (!supabaseAdmin) {
    return databaseErrorResponse('Supabase admin client unavailable')
  }

  let body: Record<string, unknown> = {}
  try {
    body = rawBody ? JSON.parse(rawBody) : {}
  } catch {
    return validationFailedResponse('Invalid JSON body')
  }

  const parsed = parseBody(body)
  if (!parsed) {
    return validationFailedResponse('user_id is required')
  }

  const payload = {
    ...parsed.payload,
    source: 'clawdbot',
  }

  const { data: historyRow, error: historyError } = await supabaseAdmin
    .from('cofounder_decisions_history')
    .insert({
      user_id: parsed.userId,
      workspace_id: parsed.workspaceId,
      event_type: parsed.eventType,
      severity: parsed.severity,
      title: parsed.title,
      detail: parsed.detail,
      payload,
    })
    .select('id, event_type, severity, title, detail, payload, created_at')
    .single()

  if (historyError) {
    return databaseErrorResponse('Failed to append cofounder history event', historyError.message)
  }

  await supabaseAdmin.from('ledger_events').insert({
    type: parsed.eventType,
    source: 'clawdbot',
    context_id: parsed.contextId,
    workspace_id: parsed.workspaceId,
    user_id: parsed.userId,
    payload,
  })

  return successResponse({
    item: historyRow,
  })
}
