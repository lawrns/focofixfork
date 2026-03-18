import type { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { authRequiredResponse, forbiddenResponse } from '@/lib/api/response-helpers'
import { isError } from '@/lib/repositories/base-repository'
import { WorkspaceRepository } from '@/lib/repositories/workspace-repository'
import { supabaseAdmin } from '@/lib/supabase-server'
import { WorkspaceAgentService } from './service'

type MinimumRole = 'member' | 'admin'

export interface WorkspaceAgentRouteContext {
  authResponse: NextResponse | undefined
  accessClient: any
  service: WorkspaceAgentService
  user: {
    id: string
    email?: string | null
  }
}

export async function getWorkspaceAgentRouteContext(
  request: NextRequest,
  workspaceId: string,
  minimumRole: MinimumRole = 'member'
): Promise<{ ok: true; context: WorkspaceAgentRouteContext } | { ok: false; response: NextResponse }> {
  const { user, supabase, error, response } = await getAuthUser(request)
  if (error || !user) {
    return {
      ok: false,
      response: mergeAuthResponse(authRequiredResponse(), response),
    }
  }

  const accessClient = supabaseAdmin ?? supabase
  const repo = new WorkspaceRepository(accessClient)
  const accessResult = minimumRole === 'admin'
    ? await repo.hasAdminAccess(workspaceId, user.id)
    : await repo.isMember(workspaceId, user.id)

  if (isError(accessResult)) {
    return {
      ok: false,
      response: mergeAuthResponse(forbiddenResponse(accessResult.error.message), response),
    }
  }

  if (!accessResult.data) {
    return {
      ok: false,
      response: mergeAuthResponse(forbiddenResponse('You do not have access to this workspace'), response),
    }
  }

  return {
    ok: true,
    context: {
      authResponse: response,
      accessClient,
      service: new WorkspaceAgentService(accessClient),
      user: {
        id: user.id,
        email: user.email,
      },
    },
  }
}
