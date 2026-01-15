import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { WorkspaceRepository } from '@/lib/repositories/workspace-repository'
import { isError } from '@/lib/repositories/base-repository'
import { authRequiredResponse, successResponse, databaseErrorResponse, missingFieldResponse, internalErrorResponse } from '@/lib/api/response-helpers'
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
      return authRequiredResponse()
    }

    const repo = new WorkspaceRepository(supabase)
    const result = await repo.findByUser(user.id)

    if (isError(result)) {
      console.error('Error fetching workspaces:', result.error)
      const errorRes = databaseErrorResponse(result.error.message, result.error.details)
      return mergeAuthResponse(errorRes, authResponse)
    }

    // Map to workspace format with icon
    const workspaces = result.data.map(ws => ({
      id: ws.id,
      name: ws.name,
      slug: ws.slug,
      icon: ws.logo_url ? undefined : '📦',
    }))

    const successRes = successResponse({
      workspaces,
      total: workspaces.length,
    })
    return mergeAuthResponse(successRes, authResponse)
  } catch (error) {
    console.error('Workspace fetch error:', error)
    return databaseErrorResponse('Failed to fetch workspaces', error)
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
      .from('workspaces')
      .insert([
        {
          name,
          slug,
        },
      ])
      .select()
      .single()

    if (createError) {
      console.error('Error creating workspace:', createError)
      return mergeAuthResponse(databaseErrorResponse('Failed to create workspace', createError), authResponse)
    }

    // Add creator as workspace member with 'admin' role
    const { error: memberError } = await supabase
      .from('workspace_members')
      .insert([
        {
          workspace_id: newWorkspace.id,
          user_id: user.id,
          role: 'admin',
        },
      ])

    if (memberError) {
      console.error('Error adding workspace member:', memberError)
      // Clean up created workspace
      await supabase
        .from('workspaces')
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
  } catch (error) {
    console.error('Workspace creation error:', error)
    return internalErrorResponse('Workspace creation error', error)
  }
}
