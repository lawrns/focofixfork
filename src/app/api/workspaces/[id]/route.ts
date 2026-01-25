import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'

export const dynamic = 'force-dynamic'

/**
 * GET /api/workspaces/[id]
 * Fetches workspace details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, supabase, error: authError, response: authResponse } = await getAuthUser(request)

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', success: false },
        { status: 401 }
      )
    }

    const { id: workspaceId } = await params

    // Check if user is a member of this workspace
    const { data: membership, error: membershipError } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (membershipError || !membership) {
      return mergeAuthResponse(
        NextResponse.json(
          { error: 'Access denied', success: false },
          { status: 403 }
        ),
        authResponse
      )
    }

    // Fetch workspace details
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('*')
      .eq('id', workspaceId)
      .single()

    if (workspaceError || !workspace) {
      return mergeAuthResponse(
        NextResponse.json(
          { error: 'Workspace not found', success: false },
          { status: 404 }
        ),
        authResponse
      )
    }

    return mergeAuthResponse(
      NextResponse.json({
        success: true,
        data: workspace,
      }),
      authResponse
    )
  } catch (error) {
    console.error('[Workspaces API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    )
  }
}
