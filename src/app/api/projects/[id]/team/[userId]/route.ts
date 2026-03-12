import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import {
  authRequiredResponse,
  successResponse,
  databaseErrorResponse,
  notFoundResponse
} from '@/lib/api/response-helpers'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { hasFounderFullAccess } from '@/lib/auth/founder-access'
import { accessFailureResponse, requireProjectAccess } from '@/server/auth/access'

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
    const { user, error, response: authResponse } = await getAuthUser(request)
    if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

    if (!hasFounderFullAccess(user)) {
      const access = await requireProjectAccess({ projectId, minimumRole: 'admin' })
      if (!access.ok) return accessFailureResponse(access)
    }

    const body = await request.json()

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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return databaseErrorResponse('Failed to update project member', message)
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
    const { user, error, response: authResponse } = await getAuthUser(request)
    if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

    if (!hasFounderFullAccess(user)) {
      const access = await requireProjectAccess({ projectId, minimumRole: 'admin' })
      if (!access.ok) return accessFailureResponse(access)
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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return databaseErrorResponse('Failed to remove project member', message)
  }
}
