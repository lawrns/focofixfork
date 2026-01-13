import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'

/**
 * GET /api/workspaces
 * Fetches all workspaces for the authenticated user
 *
 * Returns:
 * {
 *   workspaces: Array<{
 *     id: string
 *     name: string
 *     slug: string
 *     icon?: string
 *   }>
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user - this handles token refresh and returns updated response
    const { user, supabase, error: authError, response: authResponse } = await getAuthUser(request)

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', workspaces: [] },
        { status: 401 }
      )
    }

    // Fetch user's workspaces with member check
    const { data: workspaceMembers, error: memberError } = await supabase
      .from('workspace_members')
      .select(`
        workspace_id,
        workspaces (
          id,
          name,
          slug,
          logo_url
        )
      `)
      .eq('user_id', user.id)

    if (memberError) {
      console.error('Error fetching workspace members:', memberError)
      const errorRes = NextResponse.json(
        { error: 'Failed to fetch workspaces', workspaces: [] },
        { status: 500 }
      )
      return mergeAuthResponse(errorRes, authResponse)
    }

    // Map to workspace format
    const workspaces = (workspaceMembers || [])
      .filter(wm => wm.workspaces)
      .map(wm => {
        const ws = wm.workspaces as any
        return {
          id: ws.id,
          name: ws.name,
          slug: ws.slug,
          icon: ws.logo_url ? undefined : '📦',
        }
      })

    const successRes = NextResponse.json({
      workspaces,
      total: workspaces.length,
    })
    return mergeAuthResponse(successRes, authResponse)
  } catch (error) {
    console.error('Workspace fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error', workspaces: [] },
      { status: 500 }
    )
  }
}

/**
 * POST /api/workspaces
 * Creates a new workspace for the authenticated user
 *
 * Request body:
 * {
 *   name: string
 *   slug: string
 *   icon?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const { user, supabase, error: authError, response: authResponse } = await getAuthUser(request)

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name, slug, icon } = body

    if (!name || !slug) {
      const errorRes = NextResponse.json(
        { error: 'Missing required fields: name, slug' },
        { status: 400 }
      )
      return mergeAuthResponse(errorRes, authResponse)
    }

    // Create new organization/workspace
    const { data: newOrg, error: createError } = await supabase
      .from('organizations')
      .insert([
        {
          name,
          slug,
          created_by: user.id,
          is_active: true,
        },
      ])
      .select()
      .single()

    if (createError) {
      console.error('Error creating organization:', createError)
      const errorRes = NextResponse.json(
        { error: 'Failed to create workspace' },
        { status: 500 }
      )
      return mergeAuthResponse(errorRes, authResponse)
    }

    // Add creator as organization member
    const { error: memberError } = await supabase
      .from('organization_members')
      .insert([
        {
          organization_id: newOrg.id,
          user_id: user.id,
          role: 'owner',
        },
      ])

    if (memberError) {
      console.error('Error adding organization member:', memberError)
      // Clean up created organization
      await supabase
        .from('organizations')
        .delete()
        .eq('id', newOrg.id)

      const errorRes = NextResponse.json(
        { error: 'Failed to set up workspace' },
        { status: 500 }
      )
      return mergeAuthResponse(errorRes, authResponse)
    }

    const successRes = NextResponse.json(
      {
        workspace: {
          id: newOrg.id,
          name: newOrg.name,
          slug: newOrg.slug,
          icon,
        },
      },
      { status: 201 }
    )
    return mergeAuthResponse(successRes, authResponse)
  } catch (error) {
    console.error('Workspace creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
