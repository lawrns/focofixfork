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
import {
  resolveClawdbotRuntimeProfile,
  summarizeRuntimeProfile,
  upsertClawdbotRuntimeProfile,
} from '@/lib/clawdbot/runtime-profile'

export const dynamic = 'force-dynamic'

function textField(body: Record<string, unknown>, snake: string, camel: string): string | null {
  const value = body[snake] ?? body[camel]
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function objectField(body: Record<string, unknown>, snake: string, camel: string): Record<string, unknown> | undefined {
  const value = body[snake] ?? body[camel]
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined
}

function stringArrayField(body: Record<string, unknown>, snake: string, camel: string): string[] | undefined {
  const value = body[snake] ?? body[camel]
  if (!Array.isArray(value)) return undefined
  return value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
}

async function validateProjectInWorkspace(supabase: any, projectId: string | null, workspaceId: string | null) {
  if (!projectId) return true
  const { data, error } = await supabase
    .from('foco_projects')
    .select('id, workspace_id')
    .eq('id', projectId)
    .maybeSingle()

  if (error) throw error
  if (!data) return false
  if (workspaceId && data.workspace_id !== workspaceId) return false
  return true
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
    const agentKey = url.searchParams.get('agent_key') ?? 'clawdbot'

    if (!workspaceId) {
      return mergeAuthResponse(validationFailedResponse('workspace_id is required'), authResponse)
    }

    const isMember = await verifyWorkspaceMembership(supabase, user.id, workspaceId)
    if (!isMember) return mergeAuthResponse(forbiddenResponse('Workspace access denied'), authResponse)

    if (!(await validateProjectInWorkspace(supabase, projectId, workspaceId))) {
      return mergeAuthResponse(validationFailedResponse('Project is not in the requested workspace'), authResponse)
    }

    const profile = await resolveClawdbotRuntimeProfile(supabase, {
      userId: user.id,
      workspaceId,
      projectId,
      agentKey,
    })

    return mergeAuthResponse(successResponse({
      profile,
      summary: summarizeRuntimeProfile(profile),
    }), authResponse)
  } catch (error) {
    return mergeAuthResponse(databaseErrorResponse('Failed to load Clawdbot runtime profile', error), authResponse)
  }
}

export async function PUT(req: NextRequest) {
  let authResponse: NextResponse | undefined
  try {
    const { user, supabase, error, response } = await getAuthUser(req)
    authResponse = response
    if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

    const body = await req.json() as Record<string, unknown>
    const workspaceId = textField(body, 'workspace_id', 'workspaceId')
    const projectId = textField(body, 'project_id', 'projectId')

    if (!workspaceId) {
      return mergeAuthResponse(validationFailedResponse('workspace_id is required'), authResponse)
    }

    const isMember = await verifyWorkspaceMembership(supabase, user.id, workspaceId)
    if (!isMember) return mergeAuthResponse(forbiddenResponse('Workspace access denied'), authResponse)

    if (!(await validateProjectInWorkspace(supabase, projectId, workspaceId))) {
      return mergeAuthResponse(validationFailedResponse('Project is not in the requested workspace'), authResponse)
    }

    const toolModeValue = textField(body, 'tool_mode', 'toolMode')
    const toolMode = toolModeValue === 'sandbox' || toolModeValue === 'full' || toolModeValue === 'gateway'
      ? toolModeValue
      : undefined

    const profile = await upsertClawdbotRuntimeProfile(supabase, {
      userId: user.id,
      workspaceId,
      projectId,
      agentKey: textField(body, 'agent_key', 'agentKey') ?? 'clawdbot',
      displayName: textField(body, 'display_name', 'displayName') ?? 'ClawdBot',
      modelPreference: textField(body, 'model_preference', 'modelPreference'),
      toolMode,
      bootstrapFiles: stringArrayField(body, 'bootstrap_files', 'bootstrapFiles'),
      memoryScope: objectField(body, 'memory_scope', 'memoryScope'),
      sessionScope: objectField(body, 'session_scope', 'sessionScope'),
      permissions: objectField(body, 'permissions', 'permissions'),
      channelRouting: objectField(body, 'channel_routing', 'channelRouting'),
      metadata: objectField(body, 'metadata', 'metadata'),
      active: typeof body.active === 'boolean' ? body.active : true,
    })

    return mergeAuthResponse(successResponse({
      profile,
      summary: summarizeRuntimeProfile(profile),
    }), authResponse)
  } catch (error) {
    return mergeAuthResponse(databaseErrorResponse('Failed to save Clawdbot runtime profile', error), authResponse)
  }
}
