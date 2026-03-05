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
import { appendTaskMirror } from '@/lib/agent-ops/markdown-sync'
import { AGENT_LANES, TASK_SIZES, TASK_STATUSES, type AgentOpsTaskRow } from '@/lib/agent-ops/types'
import { logClawdActionVisibility } from '@/lib/cofounder-mode/clawd-visibility'

export const dynamic = 'force-dynamic'

const createTaskSchema = z.object({
  workspace_id: z.string().uuid().optional().nullable(),
  project_id: z.string().uuid().optional().nullable(),
  lane: z.enum(AGENT_LANES),
  title: z.string().min(3).max(180),
  objective: z.string().min(5).max(2000),
  acceptance_criteria: z.array(z.string().min(1).max(400)).max(10).default([]),
  size: z.enum(TASK_SIZES).default('micro'),
  metadata: z.record(z.unknown()).optional(),
})

const BUREAUCRACY_PATTERN = /\b(org\s*chart|alignment\s*meeting|create\s+roles?|manager|coordinator|director|committee|brainstorming\s+session)\b/i

function appearsBureaucratic(title: string, objective: string): boolean {
  return BUREAUCRACY_PATTERN.test(`${title} ${objective}`)
}

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
  const lane = url.searchParams.get('lane')
  const status = url.searchParams.get('status')
  const limit = parseLimit(req)

  let query = supabase
    .from('agent_ops_tasks')
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

  if (lane && AGENT_LANES.includes(lane as (typeof AGENT_LANES)[number])) {
    query = query.eq('lane', lane)
  }

  if (status && TASK_STATUSES.includes(status as (typeof TASK_STATUSES)[number])) {
    query = query.eq('status', status)
  }

  const { data, error: queryError } = await query.returns<AgentOpsTaskRow[]>()
  if (queryError) return mergeAuthResponse(databaseErrorResponse('Failed to load tasks', queryError.message), authResponse)

  return mergeAuthResponse(successResponse({ items: data ?? [] }), authResponse)
}

export async function POST(req: NextRequest) {
  const { user, supabase, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  const body = await req.json().catch(() => null)
  const parsed = createTaskSchema.safeParse(body)
  if (!parsed.success) {
    return mergeAuthResponse(validationFailedResponse('Invalid task payload', parsed.error.flatten()), authResponse)
  }

  const input = parsed.data
  if (appearsBureaucratic(input.title, input.objective) && input.metadata?.allow_meta_process !== true) {
    return mergeAuthResponse(
      validationFailedResponse('Task appears managerial/bureaucratic. Rewrite as direct execution work or set metadata.allow_meta_process=true.'),
      authResponse
    )
  }

  if (input.workspace_id) {
    const isMember = await verifyWorkspaceMembership(supabase, user.id, input.workspace_id)
    if (!isMember) {
      return mergeAuthResponse(validationFailedResponse('Workspace access denied'), authResponse)
    }
  }

  const { data, error: insertError } = await supabase
    .from('agent_ops_tasks')
    .insert({
      user_id: user.id,
      workspace_id: input.workspace_id ?? null,
      project_id: input.project_id ?? null,
      lane: input.lane,
      title: input.title.trim(),
      objective: input.objective.trim(),
      acceptance_criteria: input.acceptance_criteria,
      size: input.size,
      metadata: input.metadata ?? {},
      status: 'draft',
    })
    .select('*')
    .single<AgentOpsTaskRow>()

  if (insertError) {
    return mergeAuthResponse(databaseErrorResponse('Failed to create task', insertError.message), authResponse)
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
      eventType: 'agent_ops_task_created',
      title: `Task created: ${data.title}`,
      detail: data.objective.slice(0, 220),
      payload: {
        task_id: data.id,
        lane: data.lane,
        size: data.size,
      },
      contextId: data.id,
    }),
  ])

  return mergeAuthResponse(successResponse({ item: data }, undefined, 201), authResponse)
}
