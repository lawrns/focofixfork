import { NextRequest } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'

import { WorkspaceRepository } from '@/lib/repositories/workspace-repository'
import { WorkspaceInvitationRepository } from '@/lib/repositories/workspace-invitation-repository'
import { isError } from '@/lib/repositories/base-repository'
import {
  authRequiredResponse,
  successResponse,
  workspaceAccessDeniedResponse,
  databaseErrorResponse,
  workspaceNotFoundResponse
} from '@/lib/api/response-helpers'

export const dynamic = 'force-dynamic'

/**
 * POST /api/organizations/[id]/invitations/[invitationId]/resend
 * Resends an invitation email
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; invitationId: string } }
) {
  try {
    const { user, supabase, error, response: authResponse } = await getAuthUser(request)

    if (error || !user) {
      return authRequiredResponse()
    }

    const { id: workspaceId, invitationId } = params
    const workspaceRepo = new WorkspaceRepository(supabase)

    // Verify workspace exists
    const workspaceResult = await workspaceRepo.findById(workspaceId)
    if (isError(workspaceResult)) {
      if (workspaceResult.error.code === 'NOT_FOUND') {
        return workspaceNotFoundResponse(workspaceId)
      }
      return databaseErrorResponse(workspaceResult.error.message, workspaceResult.error.details)
    }

    // Verify user is admin
    const adminResult = await workspaceRepo.hasAdminAccess(workspaceId, user.id)
    if (isError(adminResult)) {
      return databaseErrorResponse(adminResult.error.message, adminResult.error.details)
    }

    if (!adminResult.data) {
      return workspaceAccessDeniedResponse(workspaceId)
    }

    // Resend invitation
    const invitationRepo = new WorkspaceInvitationRepository(supabase)
    const resendResult = await invitationRepo.resendInvitation(invitationId)

    if (isError(resendResult)) {
      return databaseErrorResponse(resendResult.error.message, resendResult.error.details)
    }

    return mergeAuthResponse(successResponse({ message: 'Invitation resent successfully' }), authResponse)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return databaseErrorResponse('Failed to resend invitation', message)
  }
}
