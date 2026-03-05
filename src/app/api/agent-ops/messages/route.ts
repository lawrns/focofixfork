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
import { appendMessageMirror } from '@/lib/agent-ops/markdown-sync'
import { AGENT_LANES, MESSAGE_STATUSES, type AgentOpsMessageRow } from '@/lib/agent-ops/types'
import { logClawdActionVisibility } from '@/lib/cofounder-mode/clawd-visibility'

export const dynamic = 'force-dynamic'

const createMessageSchema = z.object({
  workspace_id: z.string().uuid().optional().nullable(),
  task_id: z.string().uuid().optional().nullable(),
  from_lane: z.enum(AGENT_LANES),
  to_lane: z.enum(AGENT_LANES),
  subject: z.string().min(3).max(180),
  body: z.string().min(5).max(4000),
})

function parseLimit(req: NextRequest): number {
  const raw = Number(new URL(req.url).searchParams.get('limit') ?? 50)
  if (!Number.isFinite(raw)) return 50
  return Math.max(1, Math.min(100, Math.floor(raw)))
}

export async function GET(req: NextRequest) {
  const { user, supabase, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  const url = new URL(req.url)
  const workspaceId = url.searchParams.get('workspace_id')
  const status = url.searchParams.get('status')
  const limit = parseLimit(req)

  let query = supabase
    .from('agent_ops_messages')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (workspaceId) {
    const isMember = await verifyWorkspaceMembership(supabase, user.id, workspaceId)
    if (!isMember) {
      return mergeAuthResponse(validationFailedResponse('Workspace access denied'), authResponse)
    }
    query = query.eq('workspace_id', workspaceId)
  }

  if (status && MESSAGE_STATUSES.includes(status as (typeof MESSAGE_STATUSES)[number])) {
    query = query.eq('status', status)
  }

  const { data, error: queryError } = await query.returns<AgentOpsMessageRow[]>()
  if (queryError) {
    return mergeAuthResponse(databaseErrorResponse('Failed to load messages', queryError.message), authResponse)
  }

  return mergeAuthResponse(successResponse({ items: data ?? [] }), authResponse)
}

export async function POST(req: NextRequest) {
  const { user, supabase, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  const body = await req.json().catch(() => null)
  const parsed = createMessageSchema.safeParse(body)
  if (!parsed.success) {
    return mergeAuthResponse(validationFailedResponse('Invalid message payload', parsed.error.flatten()), authResponse)
  }

  const input = parsed.data
  if (input.workspace_id) {
    const isMember = await verifyWorkspaceMembership(supabase, user.id, input.workspace_id)
    if (!isMember) {
      return mergeAuthResponse(validationFailedResponse('Workspace access denied'), authResponse)
    }
  }

  const { data, error: insertError } = await supabase
    .from('agent_ops_messages')
    .insert({
      user_id: user.id,
      workspace_id: input.workspace_id ?? null,
      task_id: input.task_id ?? null,
      from_lane: input.from_lane,
      to_lane: input.to_lane,
      subject: input.subject.trim(),
      body: input.body.trim(),
      status: 'open',
    })
    .select('*')
    .single<AgentOpsMessageRow>()

  if (insertError) {
    return mergeAuthResponse(databaseErrorResponse('Failed to create message', insertError.message), authResponse)
  }

  await Promise.allSettled([
    appendMessageMirror({
      id: data.id,
      fromLane: data.from_lane,
      toLane: data.to_lane,
      subject: data.subject,
      body: data.body,
    }),
    logClawdActionVisibility(supabase, {
      userId: user.id,
      workspaceId: data.workspace_id,
      eventType: 'agent_ops_message_created',
      title: data.subject,
      detail: `from=${data.from_lane} to=${data.to_lane}`,
      payload: {
        message_id: data.id,
        from_lane: data.from_lane,
        to_lane: data.to_lane,
        task_id: data.task_id,
      },
      contextId: data.id,
    }),
  ])

  return mergeAuthResponse(successResponse({ item: data }, undefined, 201), authResponse)
}
