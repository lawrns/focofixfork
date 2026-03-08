import { NextRequest } from 'next/server'
import { z } from 'zod'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import {
  authRequiredResponse,
  databaseErrorResponse,
  notFoundResponse,
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

interface Params {
  params: Promise<{ id: string }>
}

const updateCustomAgentSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  kind: z.enum(['custom', 'persona', 'lane']).optional(),
  lane: z.enum(AGENT_LANES).optional(),
  role: z.string().min(2).max(120).optional(),
  description: z.string().max(800).optional().nullable(),
  system_prompt: z.string().min(20).max(12000).optional(),
  expertise: z.array(z.string().min(1).max(80)).max(20).optional(),
  incentives: z.array(z.string().min(1).max(120)).max(20).optional(),
  risk_model: z.string().min(10).max(1200).optional(),
  tool_access: z.record(z.unknown()).optional(),
  write_scope: z.array(z.string().min(1).max(200)).max(20).optional(),
  read_scope: z.array(z.string().min(1).max(200)).max(20).optional(),
  approval_sensitivity: z.enum(APPROVAL_SENSITIVITY).optional(),
  avatar_url: z.string().url().optional().nullable(),
  persona_tags: z.array(z.string().min(1).max(40)).max(20).optional(),
  active: z.boolean().optional(),
})

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params
  const { user, supabase, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  const body = await req.json().catch(() => null)
  const parsed = updateCustomAgentSchema.safeParse(body)
  if (!parsed.success) {
    return mergeAuthResponse(validationFailedResponse('Invalid custom agent payload', parsed.error.flatten()), authResponse)
  }

  const { data: existing, error: fetchError } = await supabase
    .from('custom_agent_profiles')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle<CustomAgentProfileRow>()

  if (fetchError) return mergeAuthResponse(databaseErrorResponse('Failed to load custom agent', fetchError.message), authResponse)
  if (!existing) return mergeAuthResponse(notFoundResponse('Custom agent', id), authResponse)

  if (existing.workspace_id) {
    const isMember = await verifyWorkspaceMembership(supabase, user.id, existing.workspace_id)
    if (!isMember) {
      return mergeAuthResponse(validationFailedResponse('Workspace access denied'), authResponse)
    }
  }

  const input = parsed.data
  const lane = input.lane ?? existing.lane
  const writeScope = input.write_scope ?? existing.write_scope
  const readScope = input.read_scope ?? existing.read_scope

  const writeViolations = validateWriteScopeForLane(lane, writeScope)
  if (writeViolations.length > 0) {
    return mergeAuthResponse(validationFailedResponse('write_scope violates lane policy', { paths: writeViolations }), authResponse)
  }

  const readViolations = validateReadScopeForLane(lane, readScope)
  if (readViolations.length > 0) {
    return mergeAuthResponse(validationFailedResponse('read_scope violates lane policy', { paths: readViolations }), authResponse)
  }

  const patch: Record<string, unknown> = { ...input }
  if (typeof input.name === 'string') {
    patch.slug = slugifyAgentName(input.name)
  }
  if (typeof input.role === 'string') {
    patch.role = input.role.trim()
  }
  if (typeof input.risk_model === 'string') {
    patch.risk_model = input.risk_model.trim()
  }

  const { data, error: updateError } = await supabase
    .from('custom_agent_profiles')
    .update(patch)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('*')
    .single<CustomAgentProfileRow>()

  if (updateError) {
    return mergeAuthResponse(databaseErrorResponse('Failed to update custom agent', updateError.message), authResponse)
  }

  await logClawdActionVisibility(supabase, {
    userId: user.id,
    workspaceId: data.workspace_id,
    eventType: 'custom_agent_updated',
    title: `Custom agent updated: ${data.name}`,
    detail: `lane=${data.lane}`,
    payload: {
      custom_agent_id: data.id,
      lane: data.lane,
      active: data.active,
    },
    contextId: data.id,
  })

  return mergeAuthResponse(successResponse({ item: data }), authResponse)
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { id } = await params
  const { user, supabase, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  const { data: existing, error: fetchError } = await supabase
    .from('custom_agent_profiles')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle<CustomAgentProfileRow>()

  if (fetchError) return mergeAuthResponse(databaseErrorResponse('Failed to load custom agent', fetchError.message), authResponse)
  if (!existing) return mergeAuthResponse(successResponse({ ok: true, deleted: 0, not_found: true }), authResponse)

  const { error: deleteError } = await supabase
    .from('custom_agent_profiles')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (deleteError) return mergeAuthResponse(databaseErrorResponse('Failed to delete custom agent', deleteError.message), authResponse)

  await logClawdActionVisibility(supabase, {
    userId: user.id,
    workspaceId: existing.workspace_id,
    eventType: 'custom_agent_deleted',
    title: `Custom agent deleted: ${existing.name}`,
    payload: {
      custom_agent_id: existing.id,
      lane: existing.lane,
    },
    contextId: existing.id,
  })

  return mergeAuthResponse(successResponse({ ok: true, deleted: 1 }), authResponse)
}
