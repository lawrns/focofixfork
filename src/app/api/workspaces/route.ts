import { NextRequest } from 'next/server'
import { authRequiredResponse, successResponse, databaseErrorResponse, missingFieldResponse, internalErrorResponse } from '@/lib/api/response-helpers'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { supabaseAdmin } from '@/lib/supabase-server'
import { hasFounderFullAccess } from '@/lib/auth/founder-access'

export const dynamic = 'force-dynamic'

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
      return authRequiredResponse()
    }

    const accessClient = supabaseAdmin || supabase
    let workspaceIds: string[] | null = null

    if (!hasFounderFullAccess(user)) {
      const { data: memberships, error: membershipError } = await accessClient
        .from('foco_workspace_members')
        .select('workspace_id')
        .eq('user_id', user.id)

      if (membershipError) {
        const errorRes = databaseErrorResponse('Failed to fetch workspace memberships', membershipError)
        return mergeAuthResponse(errorRes, authResponse)
      }

      workspaceIds = (memberships ?? [])
        .map((membership: { workspace_id: string | null }) => membership.workspace_id)
        .filter((workspaceId: string | null): workspaceId is string => typeof workspaceId === 'string' && workspaceId.length > 0)
    }

    let workspacesQuery = accessClient
      .from('foco_workspaces')
      .select('id, name, slug, logo_url')
      .order('created_at', { ascending: false })

    if (Array.isArray(workspaceIds)) {
      if (workspaceIds.length === 0) {
        const successRes = successResponse({ workspaces: [], total: 0 })
        return mergeAuthResponse(successRes, authResponse)
      }
      workspacesQuery = workspacesQuery.in('id', workspaceIds)
    }

    const { data: workspaceRows, error: workspacesError } = await workspacesQuery
    if (workspacesError) {
      const errorRes = databaseErrorResponse('Failed to fetch workspaces', workspacesError)
      return mergeAuthResponse(errorRes, authResponse)
    }

    // Map to workspace format with icon
    const workspaces = (workspaceRows || []).map((workspace: { id: string; name: string; slug: string; logo_url: string | null }) => ({
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      icon: workspace.logo_url ? undefined : '📦',
    }))

    const successRes = successResponse({
      workspaces,
      total: workspaces.length,
    })
    return mergeAuthResponse(successRes, authResponse)
  } catch (err) {
    console.error('[Workspaces API] GET unhandled error:', err)
    return internalErrorResponse('Failed to fetch workspaces')
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
      return authRequiredResponse()
    }

    const body = await request.json()
    const { name, slug, icon } = body

    if (!name) {
      return mergeAuthResponse(missingFieldResponse('name'), authResponse)
    }
    if (!slug) {
      return mergeAuthResponse(missingFieldResponse('slug'), authResponse)
    }

    // Create new workspace using the correct 'workspaces' table
    const { data: newWorkspace, error: createError } = await supabase
      .from('foco_workspaces')
      .insert([
        {
          name,
          slug,
        },
      ])
      .select()
      .single()

    if (createError) {
      return mergeAuthResponse(databaseErrorResponse('Failed to create workspace', createError), authResponse)
    }

    // Add creator as workspace member with 'admin' role
    const { error: memberError } = await supabase
      .from('foco_workspace_members')
      .insert([
        {
          workspace_id: newWorkspace.id,
          user_id: user.id,
          role: 'admin',
        },
      ])

    if (memberError) {
      // Clean up created workspace
      await supabase
        .from('foco_workspaces')
        .delete()
        .eq('id', newWorkspace.id)

      return mergeAuthResponse(databaseErrorResponse('Failed to set up workspace', memberError), authResponse)
    }

    const successRes = successResponse({
      workspace: {
        id: newWorkspace.id,
        name: newWorkspace.name,
        slug: newWorkspace.slug,
        icon,
      },
    }, undefined, 201)
    return mergeAuthResponse(successRes, authResponse)
  } catch (err) {
    console.error('[Workspaces API] POST unhandled error:', err)
    return internalErrorResponse('Workspace creation error')
  }
}
