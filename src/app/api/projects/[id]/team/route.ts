import { NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/api/auth-helper'

import { supabaseAdmin } from '@/lib/supabase-server'
import {
  authRequiredResponse,
  successResponse,
  forbiddenResponse,
  databaseErrorResponse,
  notFoundResponse,
  missingFieldResponse,
  conflictResponse
} from '@/lib/api/response-helpers'

export const dynamic = 'force-dynamic'

/**
 * GET /api/projects/[id]/team
 * Get all team members for a project
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params
    const { user, error: authError } = await getAuthUser(request)

    if (authError || !user) {
      return authRequiredResponse()
    }

    // Get project and verify access
    const { data: project, error: projectError } = await supabaseAdmin
      .from('foco_projects')
      .select('id, workspace_id')
      .eq('id', projectId)
      .maybeSingle()

    if (projectError) {
      return databaseErrorResponse('Failed to fetch project', projectError)
    }

    if (!project) {
      return notFoundResponse('Project', projectId)
    }

    // Verify user has access to workspace
    const { data: membership } = await supabaseAdmin
      .from('foco_workspace_members')
      .select('role')
      .eq('workspace_id', project.workspace_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!membership) {
      return forbiddenResponse('You do not have access to this project')
    }

    // Get project members with user details
    const { data: members, error: membersError } = await supabaseAdmin
      .from('foco_project_members')
      .select(`
        id,
        user_id,
        role,
        created_at,
        user_profiles!foco_project_members_user_id_fkey (
          id,
          full_name,
          email,
          avatar_url
        )
      `)
      .eq('project_id', projectId)

    if (membersError) {
      // Table might not exist, return empty array
      console.error('Error fetching project members:', membersError)
      return successResponse([])
    }

    return successResponse(members || [])
  } catch (err) {
    console.error('Project team fetch error:', err)
    return databaseErrorResponse('Failed to fetch project team', err)
  }
}

/**
 * POST /api/projects/[id]/team
 * Add a member to the project
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params
    const { user, error: authError } = await getAuthUser(request)

    if (authError || !user) {
      return authRequiredResponse()
    }

    const body = await request.json()

    if (!body.email && !body.user_id) {
      return missingFieldResponse('email or user_id')
    }

    // Get project and verify access
    const { data: project, error: projectError } = await supabaseAdmin
      .from('foco_projects')
      .select('id, workspace_id')
      .eq('id', projectId)
      .maybeSingle()

    if (projectError) {
      return databaseErrorResponse('Failed to fetch project', projectError)
    }

    if (!project) {
      return notFoundResponse('Project', projectId)
    }

    // Verify user has admin access to workspace
    const { data: membership } = await supabaseAdmin
      .from('foco_workspace_members')
      .select('role')
      .eq('workspace_id', project.workspace_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return forbiddenResponse('Only workspace admins can add project members')
    }

    // Find user by email if not provided user_id
    let targetUserId = body.user_id
    if (!targetUserId && body.email) {
      const { data: targetUser } = await supabaseAdmin
        .from('user_profiles')
        .select('id')
        .eq('email', body.email)
        .maybeSingle()

      if (!targetUser) {
        return notFoundResponse('User', body.email)
      }
      targetUserId = targetUser.id
    }

    // Check if user is already a member
    const { data: existingMember } = await supabaseAdmin
      .from('foco_project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', targetUserId)
      .maybeSingle()

    if (existingMember) {
      return conflictResponse('User is already a member of this project', { user_id: targetUserId })
    }

    // Add member to project
    const { data: newMember, error: insertError } = await supabaseAdmin
      .from('foco_project_members')
      .insert({
        project_id: projectId,
        user_id: targetUserId,
        role: body.role || 'member'
      })
      .select()
      .single()

    if (insertError) {
      return databaseErrorResponse('Failed to add project member', insertError)
    }

    return successResponse(newMember)
  } catch (err) {
    console.error('Project team add error:', err)
    return databaseErrorResponse('Failed to add project member', err)
  }
}
