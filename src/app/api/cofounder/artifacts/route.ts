import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import {
  authRequiredResponse,
  databaseErrorResponse,
  forbiddenResponse,
  successResponse,
} from '@/lib/api/response-helpers'
import { buildAuditArtifactsForScope } from '@/lib/cofounder-mode/runtime'
import { verifyWorkspaceMembership } from '@/lib/cofounder-mode/config-resolver'

export const dynamic = 'force-dynamic'

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
    const persist = searchParams.get('persist') === 'true'

    if (workspaceId) {
      const isMember = await verifyWorkspaceMembership(supabase, user.id, workspaceId)
      if (!isMember) return mergeAuthResponse(forbiddenResponse('Workspace access denied'), authResponse)
    }

    const artifacts = await buildAuditArtifactsForScope(
      supabase,
      {
        userId: user.id,
        workspaceId,
      },
      { persist }
    )

    return mergeAuthResponse(successResponse(artifacts), authResponse)
  } catch (error: unknown) {
    return mergeAuthResponse(databaseErrorResponse('Failed to build cofounder artifacts', error), authResponse)
  }
}
