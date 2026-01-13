import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'

/**
 * GET /api/organizations/[id]
 * Fetches a single workspace (organization) by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, supabase, error: authError, response: authResponse } = await getAuthUser(request)

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', success: false },
        { status: 401 }
      )
    }

    const workspaceId = params.id

    // Verify user has access to this workspace
    const { data: userMembership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single()

    if (!userMembership) {
      const errorRes = NextResponse.json(
        { error: 'Access denied', success: false },
        { status: 403 }
      )
      return mergeAuthResponse(errorRes, authResponse)
    }

    // Fetch workspace details
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('*')
      .eq('id', workspaceId)
      .single()

    if (workspaceError || !workspace) {
      console.error('Error fetching workspace:', workspaceError)
      const errorRes = NextResponse.json(
        { error: 'Workspace not found', success: false },
        { status: 404 }
      )
      return mergeAuthResponse(errorRes, authResponse)
    }

    const successRes = NextResponse.json({
      success: true,
      data: {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        description: workspace.description,
        logo_url: workspace.logo_url,
        is_active: true,
        created_by: workspace.created_by || user.id,
        created_at: workspace.created_at,
        updated_at: workspace.updated_at
      }
    })
    return mergeAuthResponse(successRes, authResponse)
  } catch (error) {
    console.error('Organization fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/organizations/[id]
 * Updates workspace details
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, supabase, error: authError, response: authResponse } = await getAuthUser(request)

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', success: false },
        { status: 401 }
      )
    }

    const workspaceId = params.id

    // Verify user is admin
    const { data: userMembership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single()

    if (!userMembership || userMembership.role !== 'admin') {
      const errorRes = NextResponse.json(
        { error: 'Admin access required', success: false },
        { status: 403 }
      )
      return mergeAuthResponse(errorRes, authResponse)
    }

    const body = await request.json()
    const updates: any = {}

    if (body.name) updates.name = body.name
    if (body.description !== undefined) updates.description = body.description
    if (body.logo_url !== undefined) updates.logo_url = body.logo_url

    const { data: workspace, error: updateError } = await supabase
      .from('workspaces')
      .update(updates)
      .eq('id', workspaceId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating workspace:', updateError)
      const errorRes = NextResponse.json(
        { error: updateError.message, success: false },
        { status: 500 }
      )
      return mergeAuthResponse(errorRes, authResponse)
    }

    const successRes = NextResponse.json({
      success: true,
      data: workspace
    })
    return mergeAuthResponse(successRes, authResponse)
  } catch (error) {
    console.error('Organization update error:', error)
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    )
  }
}
