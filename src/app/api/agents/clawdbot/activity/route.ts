import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import {
  authRequiredResponse,
  databaseErrorResponse,
  forbiddenResponse,
  successResponse,
  validationFailedResponse,
} from '@/lib/api/response-helpers'
import { verifyWorkspaceMembership } from '@/lib/cofounder-mode/config-resolver'
import { recordClawdbotActivity } from '@/lib/clawdbot/activity'
import { upsertClawdbotRuntimeProfile } from '@/lib/clawdbot/runtime-profile'
import { authorizeAgentCallback } from '@/lib/security/agent-callback-auth'
import { supabaseAdmin } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

function parseLimit(value: string | null): number {
  if (!value) return 40
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed)) return 40
  return Math.max(1, Math.min(parsed, 100))
}

function textField(body: Record<string, unknown>, snake: string, camel: string): string | null {
  const value = body[snake] ?? body[camel]
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function objectField(body: Record<string, unknown>, snake: string, camel: string): Record<string, unknown> {
  const value = body[snake] ?? body[camel]
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

async function validateScope(workspaceId: string | null, projectId: string | null) {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client unavailable')
  }

  if (!projectId) return { workspaceId }

  const { data: project, error } = await supabaseAdmin
    .from('foco_projects')
    .select('id, workspace_id')
    .eq('id', projectId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!project) throw new Error('Project not found')
  if (workspaceId && project.workspace_id !== workspaceId) {
    throw new Error('Project is not in the requested workspace')
  }

  return {
    workspaceId: typeof project.workspace_id === 'string' ? project.workspace_id : workspaceId,
  }
}

export async function GET(req: NextRequest) {
  let authResponse: NextResponse | undefined
  try {
    const { user, supabase, error, response } = await getAuthUser(req)
    authResponse = response
    if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

    const url = new URL(req.url)
    const workspaceId = url.searchParams.get('workspace_id')
    const projectId = url.searchParams.get('project_id')
    const eventType = url.searchParams.get('event_type')
    const limit = parseLimit(url.searchParams.get('limit'))

    if (workspaceId) {
      const isMember = await verifyWorkspaceMembership(supabase, user.id, workspaceId)
      if (!isMember) return mergeAuthResponse(forbiddenResponse('Workspace access denied'), authResponse)
    }

    let query = supabase
      .from('agent_activity_events')
      .select('*')
      .eq('user_id', user.id)
      .eq('agent_backend', 'clawdbot')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (workspaceId) query = query.eq('workspace_id', workspaceId)
    if (projectId) query = query.eq('project_id', projectId)
    if (eventType) query = query.eq('event_type', eventType)

    const { data, error: queryError } = await query
    if (queryError) {
      return mergeAuthResponse(databaseErrorResponse('Failed to load Clawdbot activity', queryError), authResponse)
    }

    return mergeAuthResponse(successResponse({
      items: data ?? [],
      filters: { workspaceId, projectId, eventType, limit },
    }), authResponse)
  } catch (error) {
    return mergeAuthResponse(databaseErrorResponse('Failed to load Clawdbot activity', error), authResponse)
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  if (!authorizeAgentCallback(req, rawBody)) {
    return authRequiredResponse('Clawdbot callback authentication required')
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

  const userId = textField(body, 'user_id', 'userId')
  if (!userId) return validationFailedResponse('user_id is required')

  const workspaceId = textField(body, 'workspace_id', 'workspaceId')
  const projectId = textField(body, 'project_id', 'projectId')
  const taskId = textField(body, 'task_id', 'taskId')
  const runId = textField(body, 'run_id', 'runId')
  const agentKey = textField(body, 'agent_key', 'agentKey') ?? textField(body, 'agent_id', 'agentId') ?? 'clawdbot'
  const eventType = textField(body, 'event_type', 'eventType') ?? 'clawdbot.activity'
  const sessionKey = textField(body, 'session_key', 'sessionKey')
  const correlationId = textField(body, 'correlation_id', 'correlationId')
  const title = textField(body, 'title', 'title') ?? `Clawdbot ${eventType}`
  const detail = textField(body, 'detail', 'detail')
  const severityRaw = textField(body, 'severity', 'severity')
  const directionRaw = textField(body, 'direction', 'direction')
  const idempotencyKey = req.headers.get('x-idempotency-key') ?? textField(body, 'idempotency_key', 'idempotencyKey')
  const payload = objectField(body, 'payload', 'payload')

  const severity = severityRaw === 'warning' || severityRaw === 'error' ? severityRaw : 'info'
  const direction = directionRaw === 'inbound' || directionRaw === 'outbound' || directionRaw === 'tool' || directionRaw === 'system'
    ? directionRaw
    : 'internal'

  let resolvedWorkspaceId = workspaceId
  try {
    const scope = await validateScope(workspaceId, projectId)
    resolvedWorkspaceId = scope.workspaceId ?? workspaceId
  } catch (error) {
    return validationFailedResponse(error instanceof Error ? error.message : 'Invalid activity scope')
  }

  try {
    await upsertClawdbotRuntimeProfile(supabaseAdmin, {
      userId,
      workspaceId: resolvedWorkspaceId,
      projectId,
      agentKey,
      metadata: {
        last_activity_at: new Date().toISOString(),
        last_event_type: eventType,
      },
    })

    const result = await recordClawdbotActivity(supabaseAdmin, {
      userId,
      workspaceId: resolvedWorkspaceId,
      projectId,
      taskId,
      runId,
      agentKey,
      eventType,
      title,
      detail,
      severity,
      direction,
      sessionKey,
      correlationId,
      source: 'clawdbot_bridge',
      payload,
      idempotencyKey,
    })

    return successResponse({
      item: result.row,
      idempotent: result.idempotent,
    }, undefined, result.idempotent ? 200 : 201)
  } catch (error) {
    return databaseErrorResponse('Failed to record Clawdbot activity', error)
  }
}
