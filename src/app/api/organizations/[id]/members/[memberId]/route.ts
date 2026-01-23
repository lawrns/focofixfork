import { NextRequest } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'

import { WorkspaceRepository } from '@/lib/repositories/workspace-repository'
import { isError } from '@/lib/repositories/base-repository'
import {
  authRequiredResponse,
  successResponse,
  forbiddenResponse,
  missingFieldResponse,
  databaseErrorResponse,
  internalErrorResponse
} from '@/lib/api/response-helpers'

export const dynamic = 'force-dynamic'

/**
 * PATCH /api/organizations/[id]/members/[memberId]
 * Updates a member's role in the workspace
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const { user, supabase, error: authError, response: authResponse } = await getAuthUser(request)

    if (authError || !user) {
      return mergeAuthResponse(authRequiredResponse(), authResponse)
    }

    const { id: workspaceId, memberId } = await params
    const repo = new WorkspaceRepository(supabase)

    // Verify user has admin access
    const adminAccessResult = await repo.hasAdminAccess(workspaceId, user.id)

    if (isError(adminAccessResult)) {
      const errorRes = databaseErrorResponse(adminAccessResult.error.message, adminAccessResult.error.details)
      return mergeAuthResponse(errorRes, authResponse)
    }

    if (!adminAccessResult.data) {
      return mergeAuthResponse(forbiddenResponse('Admin access required'), authResponse)
    }

    const body = await request.json()

    if (!body.role) {
      return mergeAuthResponse(missingFieldResponse('role'), authResponse)
    }

    // Get the member to find their user_id
    const { data: memberData, error: memberError } = await supabase
      .from('workspace_members')
      .select('user_id')
      .eq('id', memberId)
      .eq('workspace_id', workspaceId)
      .maybeSingle()

    if (memberError) {
      const errorRes = databaseErrorResponse('Failed to fetch member', memberError)
      return mergeAuthResponse(errorRes, authResponse)
    }

    if (!memberData) {
      const errorRes = databaseErrorResponse('Member not found', { memberId, workspaceId })
      return mergeAuthResponse(errorRes, authResponse)
    }

    // Update member role using repository
    const updateResult = await repo.updateMemberRole(workspaceId, memberData.user_id, body.role)

    if (isError(updateResult)) {
      const errorRes = databaseErrorResponse(updateResult.error.message, updateResult.error.details)
      return mergeAuthResponse(errorRes, authResponse)
    }

    const successRes = successResponse({
      message: 'Member role updated successfully',
      member: updateResult.data
    })
    return mergeAuthResponse(successRes, authResponse)
  } catch (error) {
    return internalErrorResponse('Failed to update member', error)
  }
}

/**
 * DELETE /api/organizations/[id]/members/[memberId]
 * Removes a member from the workspace
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const { user, supabase, error: authError, response: authResponse } = await getAuthUser(request)

    if (authError || !user) {
      return mergeAuthResponse(authRequiredResponse(), authResponse)
    }

    const { id: workspaceId, memberId } = await params
    const repo = new WorkspaceRepository(supabase)

    // Verify user has admin access
    const adminAccessResult = await repo.hasAdminAccess(workspaceId, user.id)

    if (isError(adminAccessResult)) {
      const errorRes = databaseErrorResponse(adminAccessResult.error.message, adminAccessResult.error.details)
      return mergeAuthResponse(errorRes, authResponse)
    }

    if (!adminAccessResult.data) {
      return mergeAuthResponse(forbiddenResponse('Admin access required'), authResponse)
    }

    // Get the member to check if they're removing themselves
    const { data: memberToRemove, error: memberError } = await supabase
      .from('workspace_members')
      .select('user_id')
      .eq('id', memberId)
      .eq('workspace_id', workspaceId)
      .maybeSingle()

    if (memberError) {
      const errorRes = databaseErrorResponse('Failed to fetch member', memberError)
      return mergeAuthResponse(errorRes, authResponse)
    }

    if (!memberToRemove) {
      const errorRes = databaseErrorResponse('Member not found', { memberId, workspaceId })
      return mergeAuthResponse(errorRes, authResponse)
    }

    if (memberToRemove.user_id === user.id) {
      return mergeAuthResponse(
        forbiddenResponse('Cannot remove yourself from the workspace'),
        authResponse
      )
    }

    // Remove member using repository
    const removeResult = await repo.removeMember(workspaceId, memberToRemove.user_id)

    if (isError(removeResult)) {
      const errorRes = databaseErrorResponse(removeResult.error.message, removeResult.error.details)
      return mergeAuthResponse(errorRes, authResponse)
    }

    const successRes = successResponse({
      message: 'Member removed successfully'
    })
    return mergeAuthResponse(successRes, authResponse)
  } catch (error) {
    return internalErrorResponse('Failed to remove member', error)
  }
}
