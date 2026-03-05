import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import {
  authRequiredResponse,
  databaseErrorResponse,
  forbiddenResponse,
  successResponse,
} from '@/lib/api/response-helpers'
import { resolveEffectiveCoFounderModeConfig, verifyWorkspaceMembership } from '@/lib/cofounder-mode/config-resolver'

export const dynamic = 'force-dynamic'

interface RuntimeStateRow {
  trust_score: number
  autonomy_mode: string
  state: Record<string, unknown>
  updated_at: string
}

export async function GET(req: NextRequest) {
  let authResponse: NextResponse | undefined

  try {
    const { user, supabase, error: authError, response } = await getAuthUser(req)
    authResponse = response

    if (authError || !user) {
      return mergeAuthResponse(authRequiredResponse(), authResponse)
    }

    const { searchParams } = new URL(req.url)
    const workspaceId = searchParams.get('workspace_id')

    if (workspaceId) {
      const isMember = await verifyWorkspaceMembership(supabase, user.id, workspaceId)
      if (!isMember) return mergeAuthResponse(forbiddenResponse('Workspace access denied'), authResponse)
    }

    const resolved = await resolveEffectiveCoFounderModeConfig(supabase, user.id, workspaceId)

    let query = supabase
      .from('cofounder_runtime_state')
      .select('trust_score, autonomy_mode, state, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1)

    if (workspaceId) {
      query = query.eq('workspace_id', workspaceId)
    } else {
      query = query.is('workspace_id', null)
    }

    const { data } = await query.maybeSingle<RuntimeStateRow>()

    return mergeAuthResponse(
      successResponse({
        mode: resolved.config.mode,
        trustScore: data?.trust_score ?? null,
        state: data?.state ?? {},
        updatedAt: data?.updated_at ?? null,
        source: resolved.source,
      }),
      authResponse
    )
  } catch (error: unknown) {
    return mergeAuthResponse(databaseErrorResponse('Failed to load cofounder runtime state', error), authResponse)
  }
}
