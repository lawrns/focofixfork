import { NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/api/auth-helper'

import { WorkspaceInvitationRepository } from '@/lib/repositories/workspace-invitation-repository'
import { isError } from '@/lib/repositories/base-repository'
import {
  authRequiredResponse,
  successResponse,
  notFoundResponse,
  databaseErrorResponse,
  badRequestResponse
} from '@/lib/api/response-helpers'

export const dynamic = 'force-dynamic'

/**
 * GET /api/invitations/[token]
 * Get invitation details by token (for preview before accepting)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params
    const { user, supabase, error } = await getAuthUser(request)

    if (error || !user) {
      return authRequiredResponse()
    }

    const invitationRepo = new WorkspaceInvitationRepository(supabase)
    const invitationResult = await invitationRepo.findByToken(token)

    if (isError(invitationResult)) {
      return databaseErrorResponse(invitationResult.error.message, invitationResult.error.details)
    }

    const invitation = invitationResult.data

    if (!invitation) {
      return notFoundResponse('Invitation', token)
    }

    if (invitation.status !== 'pending') {
      return badRequestResponse(`Invitation has already been ${invitation.status}`)
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return badRequestResponse('Invitation has expired')
    }

    return successResponse({
      id: invitation.id,
      workspace_id: invitation.workspace_id,
      email: invitation.email,
      role: invitation.role,
      expires_at: invitation.expires_at,
      status: invitation.status
    })
  } catch (err) {
    console.error('Invitation fetch error:', err)
    return databaseErrorResponse('Failed to fetch invitation', err)
  }
}

/**
 * POST /api/invitations/[token]
 * Accept an invitation
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params
    const { user, supabase, error } = await getAuthUser(request)

    if (error || !user) {
      return authRequiredResponse()
    }

    const invitationRepo = new WorkspaceInvitationRepository(supabase)
    
    // First verify the invitation exists and is valid
    const invitationResult = await invitationRepo.findByToken(token)
    if (isError(invitationResult)) {
      return databaseErrorResponse(invitationResult.error.message, invitationResult.error.details)
    }

    const invitation = invitationResult.data
    if (!invitation) {
      return notFoundResponse('Invitation', token)
    }

    if (invitation.status !== 'pending') {
      return badRequestResponse(`Invitation has already been ${invitation.status}`)
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return badRequestResponse('Invitation has expired')
    }

    // Verify email matches the authenticated user
    if (invitation.email !== user.email) {
      return badRequestResponse('This invitation was sent to a different email address')
    }

    // Accept the invitation
    const acceptResult = await invitationRepo.acceptInvitation(token)

    if (isError(acceptResult)) {
      return databaseErrorResponse(acceptResult.error.message, acceptResult.error.details)
    }

    return successResponse({
      message: 'Invitation accepted successfully',
      workspace_id: acceptResult.data.workspace_id
    })
  } catch (err) {
    console.error('Invitation accept error:', err)
    return databaseErrorResponse('Failed to accept invitation', err)
  }
}
