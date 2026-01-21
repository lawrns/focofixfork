import { NextRequest } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import {
  authRequiredResponse,
  successResponse,
  forbiddenResponse,
  databaseErrorResponse,
  internalErrorResponse,
} from '@/lib/api/response-helpers'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, supabase, error, response: authResponse } = await getAuthUser(req)

    if (error || !user) {
      return mergeAuthResponse(authRequiredResponse(), authResponse)
    }

    const { id: workspaceId } = await params

    // Verify user is a member of this workspace
    const { data: membership, error: memberError } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (memberError) {
      return databaseErrorResponse('Failed to verify workspace membership', memberError)
    }

    if (!membership) {
      return forbiddenResponse('You are not a member of this workspace')
    }

    // Fetch projects for this workspace
    const { data: projects, error: projectsError } = await supabase
      .from('foco_projects')
      .select('id, name, description, status, created_at')
      .eq('workspace_id', workspaceId)
      .order('name', { ascending: true })

    if (projectsError) {
      return databaseErrorResponse('Failed to fetch projects', projectsError)
    }

    return mergeAuthResponse(
      successResponse({
        projects: projects || [],
        count: projects?.length || 0,
      }),
      authResponse
    )
  } catch (err: any) {
    console.error('Workspace projects error:', err)
    return internalErrorResponse('Failed to fetch workspace projects', err)
  }
}
