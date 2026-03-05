import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import {
  authRequiredResponse,
  badRequestResponse,
  databaseErrorResponse,
  forbiddenResponse,
  successResponse,
} from '@/lib/api/response-helpers'
import {
  buildLegacyPolicyFromConfig,
  persistCoFounderModeConfig,
  resolveEffectiveCoFounderModeConfig,
  verifyWorkspaceMembership,
} from '@/lib/cofounder-mode/config-resolver'
import { parseCoFounderModeConfig } from '@/lib/cofounder-mode/parse'

export const dynamic = 'force-dynamic'

function parseWorkspaceId(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

export async function GET(req: NextRequest) {
  let authResponse: NextResponse | undefined
  try {
    const { user, supabase, error: authError, response } = await getAuthUser(req)
    authResponse = response
    if (authError || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

    const { searchParams } = new URL(req.url)
    const workspaceId = parseWorkspaceId(searchParams.get('workspace_id'))

    if (workspaceId) {
      const isMember = await verifyWorkspaceMembership(supabase, user.id, workspaceId)
      if (!isMember) return mergeAuthResponse(forbiddenResponse('Workspace access denied'), authResponse)
    }

    const resolved = await resolveEffectiveCoFounderModeConfig(supabase, user.id, workspaceId)

    return mergeAuthResponse(
      successResponse({
        config: resolved.config,
        source: resolved.source,
        issues: resolved.issues,
        legacyPolicy: buildLegacyPolicyFromConfig(resolved.config),
      }),
      authResponse
    )
  } catch (error: unknown) {
    return mergeAuthResponse(databaseErrorResponse('Failed to load cofounder config', error), authResponse)
  }
}

export async function PUT(req: NextRequest) {
  let authResponse: NextResponse | undefined
  try {
    const { user, supabase, error: authError, response } = await getAuthUser(req)
    authResponse = response
    if (authError || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

    const body = await req.json().catch(() => ({} as Record<string, unknown>))
    const workspaceId = parseWorkspaceId(body.workspace_id)
    const rawConfig = (body.config ?? body) as unknown

    if (workspaceId) {
      const isMember = await verifyWorkspaceMembership(supabase, user.id, workspaceId)
      if (!isMember) return mergeAuthResponse(forbiddenResponse('Workspace access denied'), authResponse)
    }

    const parsed = parseCoFounderModeConfig(rawConfig)
    if (parsed.issues.length > 0 && body.allow_warnings !== true) {
      return mergeAuthResponse(
        badRequestResponse('Config failed strict validation', {
          issues: parsed.issues,
        }),
        authResponse
      )
    }

    const persisted = await persistCoFounderModeConfig(
      supabase,
      user.id,
      parsed.config,
      workspaceId,
      typeof body.note === 'string' ? body.note : undefined
    )

    if (!persisted.persisted) {
      return mergeAuthResponse(
        databaseErrorResponse('Failed to persist cofounder config', persisted.error),
        authResponse
      )
    }

    return mergeAuthResponse(
      successResponse({
        id: persisted.id,
        config: parsed.config,
        issues: parsed.issues,
        legacyPolicy: buildLegacyPolicyFromConfig(parsed.config),
      }),
      authResponse
    )
  } catch (error: unknown) {
    return mergeAuthResponse(databaseErrorResponse('Failed to update cofounder config', error), authResponse)
  }
}
