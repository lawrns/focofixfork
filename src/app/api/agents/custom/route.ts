import { NextRequest } from 'next/server'
import { z } from 'zod'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import {
  authRequiredResponse,
  conflictResponse,
  databaseErrorResponse,
  successResponse,
  validationFailedResponse,
} from '@/lib/api/response-helpers'
import { verifyWorkspaceMembership } from '@/lib/cofounder-mode/config-resolver'
import {
  AGENT_LANES,
  APPROVAL_SENSITIVITY,
  type CustomAgentProfileRow,
} from '@/lib/agent-ops/types'
import {
  slugifyAgentName,
  validateReadScopeForLane,
  validateWriteScopeForLane,
} from '@/lib/agent-ops/lane-policy'
import { logClawdActionVisibility } from '@/lib/cofounder-mode/clawd-visibility'

export const dynamic = 'force-dynamic'

const createCustomAgentSchema = z.object({
  workspace_id: z.string().uuid().optional().nullable(),
  name: z.string().min(2).max(100),
  kind: z.enum(['custom', 'persona', 'lane']).default('custom'),
  lane: z.enum(AGENT_LANES),
  role: z.string().min(2).max(120).default('Specialist advisor'),
  description: z.string().max(800).optional().nullable(),
  system_prompt: z.string().min(20).max(12000),
  expertise: z.array(z.string().min(1).max(80)).max(20).default([]),
  incentives: z.array(z.string().min(1).max(120)).max(20).default([]),
  risk_model: z.string().min(10).max(1200).default('Balance speed, quality, and risk according to role.'),
  tool_access: z.record(z.unknown()).optional(),
  write_scope: z.array(z.string().min(1).max(200)).max(20).default([]),
  read_scope: z.array(z.string().min(1).max(200)).max(20).default([]),
  approval_sensitivity: z.enum(APPROVAL_SENSITIVITY).default('high'),
  avatar_url: z.string().url().optional().nullable(),
  persona_tags: z.array(z.string().min(1).max(40)).max(20).default([]),
  active: z.boolean().optional(),
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
  const active = url.searchParams.get('active')
  const limit = parseLimit(req)

  let query = supabase
    .from('custom_agent_profiles')
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

  if (active === 'true') query = query.eq('active', true)
  if (active === 'false') query = query.eq('active', false)

  const { data, error: queryError } = await query.returns<CustomAgentProfileRow[]>()
  if (queryError) {
    return mergeAuthResponse(databaseErrorResponse('Failed to load custom agents', queryError.message), authResponse)
  }

  return mergeAuthResponse(successResponse({ items: data ?? [] }), authResponse)
}

export async function POST(req: NextRequest) {
  const { user, supabase, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  const body = await req.json().catch(() => null)
  const parsed = createCustomAgentSchema.safeParse(body)
  if (!parsed.success) {
    return mergeAuthResponse(validationFailedResponse('Invalid custom agent payload', parsed.error.flatten()), authResponse)
  }

  const input = parsed.data
  if (input.workspace_id) {
    const isMember = await verifyWorkspaceMembership(supabase, user.id, input.workspace_id)
    if (!isMember) {
      return mergeAuthResponse(validationFailedResponse('Workspace access denied'), authResponse)
    }
  }

  const slug = slugifyAgentName(input.name)
  if (!slug) {
    return mergeAuthResponse(validationFailedResponse('Name must include letters or numbers'), authResponse)
  }

  const writeViolations = validateWriteScopeForLane(input.lane, input.write_scope)
  if (writeViolations.length > 0) {
    return mergeAuthResponse(validationFailedResponse('write_scope violates lane policy', { paths: writeViolations }), authResponse)
  }

  const readViolations = validateReadScopeForLane(input.lane, input.read_scope)
  if (readViolations.length > 0) {
    return mergeAuthResponse(validationFailedResponse('read_scope violates lane policy', { paths: readViolations }), authResponse)
  }

  const { data, error: insertError } = await supabase
    .from('custom_agent_profiles')
    .insert({
      user_id: user.id,
      workspace_id: input.workspace_id ?? null,
      name: input.name.trim(),
      slug,
      kind: input.kind,
      lane: input.lane,
      role: input.role.trim(),
      description: input.description ?? null,
      system_prompt: input.system_prompt.trim(),
      expertise: input.expertise,
      incentives: input.incentives,
      risk_model: input.risk_model.trim(),
      tool_access: input.tool_access ?? {},
      write_scope: input.write_scope,
      read_scope: input.read_scope,
      approval_sensitivity: input.approval_sensitivity,
      avatar_url: input.avatar_url ?? null,
      persona_tags: input.persona_tags,
      active: input.active ?? true,
    })
    .select('*')
    .single<CustomAgentProfileRow>()

  if (insertError) {
    if (insertError.code === '23505') {
      return mergeAuthResponse(conflictResponse(`Custom agent slug already exists: ${slug}`), authResponse)
    }
    return mergeAuthResponse(databaseErrorResponse('Failed to create custom agent', insertError.message), authResponse)
  }

  await logClawdActionVisibility(supabase, {
    userId: user.id,
    workspaceId: data.workspace_id,
    eventType: 'custom_agent_created',
    title: `Custom agent created: ${data.name}`,
    detail: `lane=${data.lane}`,
    payload: {
      custom_agent_id: data.id,
      lane: data.lane,
      slug: data.slug,
    },
    contextId: data.id,
  })

  return mergeAuthResponse(successResponse({ item: data }, undefined, 201), authResponse)
}
