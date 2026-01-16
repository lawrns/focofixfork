import { NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/api/auth-helper'

import { supabaseAdmin } from '@/lib/supabase-server'
import {
  authRequiredResponse,
  successResponse,
  forbiddenResponse,
  databaseErrorResponse,
  notFoundResponse
} from '@/lib/api/response-helpers'

export const dynamic = 'force-dynamic'

/**
 * PATCH /api/projects/[id]/team/[userId]
 * Update a member's role in the project
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const { id: projectId, userId: targetUserId } = await params
    const { user, error: authError } = await getAuthUser(request)

    if (authError || !user) {
      return authRequiredResponse()
    }

    const body = await request.json()

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
      return forbiddenResponse('Only workspace admins can update project member roles')
    }

    // Update member role
    const { data: updatedMember, error: updateError } = await supabaseAdmin
      .from('foco_project_members')
      .update({ role: body.role, updated_at: new Date().toISOString() })
      .eq('project_id', projectId)
      .eq('user_id', targetUserId)
      .select()
      .single()

    if (updateError) {
      return databaseErrorResponse('Failed to update member role', updateError)
    }

    if (!updatedMember) {
      return notFoundResponse('Project member', targetUserId)
    }

    return successResponse(updatedMember)
  } catch (err) {
    console.error('Project team update error:', err)
    return databaseErrorResponse('Failed to update project member', err)
  }
}

/**
 * DELETE /api/projects/[id]/team/[userId]
 * Remove a member from the project
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const { id: projectId, userId: targetUserId } = await params
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

    // Verify user has admin access to workspace
    const { data: membership } = await supabaseAdmin
      .from('foco_workspace_members')
      .select('role')
      .eq('workspace_id', project.workspace_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return forbiddenResponse('Only workspace admins can remove project members')
    }

    // Remove member from project
    const { error: deleteError } = await supabaseAdmin
      .from('foco_project_members')
      .delete()
      .eq('project_id', projectId)
      .eq('user_id', targetUserId)

    if (deleteError) {
      return databaseErrorResponse('Failed to remove project member', deleteError)
    }

    return successResponse({ message: 'Member removed successfully' })
  } catch (err) {
    console.error('Project team delete error:', err)
    return databaseErrorResponse('Failed to remove project member', err)
  }
}
