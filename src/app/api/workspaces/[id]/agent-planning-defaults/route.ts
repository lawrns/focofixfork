import { NextRequest } from 'next/server'
import { z } from 'zod'

import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import {
  authRequiredResponse,
  databaseErrorResponse,
  successResponse,
  validationFailedResponse,
} from '@/lib/api/response-helpers'
import { checkWorkspaceMembership, checkWorkspaceRole } from '@/lib/middleware/authorization'

export const dynamic = 'force-dynamic'

interface Params {
  params: Promise<{ id: string }>
}

const planningAgentSchema = z.object({
  id: z.string().min(1).max(200),
  kind: z.enum(['system', 'custom', 'persona', 'lane']),
  name: z.string().min(1).max(120),
  role: z.string().min(1).max(160),
  expertise: z.array(z.string().min(1).max(120)).max(20).default([]),
  incentives: z.array(z.string().min(1).max(160)).max(20).default([]),
  risk_model: z.string().min(1).max(2000),
  description: z.string().max(1200).optional().nullable(),
  source: z.string().max(120).optional().nullable(),
})

const updateSchema = z.object({
  selected_agents: z.array(planningAgentSchema).max(24).default([]),
})

export async function GET(req: NextRequest, { params }: Params) {
  const { id: workspaceId } = await params
  const { user, supabase, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  const isMember = await checkWorkspaceMembership(user.id, workspaceId)
  if (!isMember) {
    return mergeAuthResponse(validationFailedResponse('Workspace access denied'), authResponse)
  }

  const { data, error: queryError } = await supabase
    .from('foco_workspaces')
    .select('id, agent_planning_defaults')
    .eq('id', workspaceId)
    .single<{ id: string; agent_planning_defaults: Record<string, unknown> | null }>()

  if (queryError) {
    return mergeAuthResponse(databaseErrorResponse('Failed to load workspace planning defaults', queryError.message), authResponse)
  }

  return mergeAuthResponse(successResponse({
    workspace_id: workspaceId,
    defaults: data?.agent_planning_defaults ?? { selected_agents: [] },
  }), authResponse)
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id: workspaceId } = await params
  const { user, supabase, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  const canManage = await checkWorkspaceRole(user.id, workspaceId, ['owner', 'admin'])
  if (!canManage) {
    return mergeAuthResponse(validationFailedResponse('Workspace settings access denied'), authResponse)
  }

  const body = await req.json().catch(() => null)
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return mergeAuthResponse(validationFailedResponse('Invalid planning defaults payload', parsed.error.flatten()), authResponse)
  }

  const defaults = {
    selected_agents: parsed.data.selected_agents,
    updated_at: new Date().toISOString(),
    updated_by: user.id,
  }

  const { data, error: updateError } = await supabase
    .from('foco_workspaces')
    .update({ agent_planning_defaults: defaults })
    .eq('id', workspaceId)
    .select('id, agent_planning_defaults')
    .single<{ id: string; agent_planning_defaults: Record<string, unknown> | null }>()

  if (updateError) {
    return mergeAuthResponse(databaseErrorResponse('Failed to update workspace planning defaults', updateError.message), authResponse)
  }

  return mergeAuthResponse(successResponse({
    workspace_id: workspaceId,
    defaults: data?.agent_planning_defaults ?? defaults,
  }), authResponse)
}
