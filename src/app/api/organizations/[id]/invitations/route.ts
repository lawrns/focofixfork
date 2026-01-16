import { NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/api/auth-helper'
import { WorkspaceRepository } from '@/lib/repositories/workspace-repository'
import { WorkspaceInvitationRepository } from '@/lib/repositories/workspace-invitation-repository'
import { isError } from '@/lib/repositories/base-repository'
import {
  authRequiredResponse,
  successResponse,
  workspaceAccessDeniedResponse,
  databaseErrorResponse,
  workspaceNotFoundResponse,
  missingFieldResponse,
  conflictResponse
} from '@/lib/api/response-helpers'

/**
 * GET /api/organizations/[id]/invitations
 * Fetches all pending invitations for a workspace
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, supabase, error } = await getAuthUser(request)

    if (error || !user) {
      return authRequiredResponse()
    }

    const workspaceId = params.id
    const workspaceRepo = new WorkspaceRepository(supabase)

    // Verify workspace exists
    const workspaceResult = await workspaceRepo.findById(workspaceId)
    if (isError(workspaceResult)) {
      if (workspaceResult.error.code === 'NOT_FOUND') {
        return workspaceNotFoundResponse(workspaceId)
      }
      return databaseErrorResponse(workspaceResult.error.message, workspaceResult.error.details)
    }

    // Verify user has access to this workspace
    const memberResult = await workspaceRepo.isMember(workspaceId, user.id)
    if (isError(memberResult)) {
      return databaseErrorResponse(memberResult.error.message, memberResult.error.details)
    }

    if (!memberResult.data) {
      return workspaceAccessDeniedResponse(workspaceId)
    }

    // Fetch invitations
    const invitationRepo = new WorkspaceInvitationRepository(supabase)
    const invitationsResult = await invitationRepo.findPendingByWorkspace(workspaceId)

    if (isError(invitationsResult)) {
      return databaseErrorResponse(invitationsResult.error.message, invitationsResult.error.details)
    }

    return successResponse(invitationsResult.data)
  } catch (err) {
    console.error('Invitations fetch error:', err)
    return databaseErrorResponse('Failed to fetch invitations', err)
  }
}

/**
 * POST /api/organizations/[id]/invitations
 * Creates a new invitation for the workspace
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, supabase, error } = await getAuthUser(request)

    if (error || !user) {
      return authRequiredResponse()
    }

    const workspaceId = params.id
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

    const body = await request.json()

    if (!body.email) {
      return missingFieldResponse('email')
    }

    const invitationRepo = new WorkspaceInvitationRepository(supabase)

    // Check if user already exists and add directly as member
    const userResult = await invitationRepo.findUserByEmail(body.email)
    if (isError(userResult)) {
      return databaseErrorResponse(userResult.error.message, userResult.error.details)
    }

    const existingUser = userResult.data

    if (existingUser) {
      // Check if already a member
      const memberResult = await invitationRepo.isMember(workspaceId, existingUser.id)
      if (isError(memberResult)) {
        return databaseErrorResponse(memberResult.error.message, memberResult.error.details)
      }

      if (memberResult.data) {
        return conflictResponse('User is already a member', { email: body.email })
      }

      // Add user directly as member
      const addResult = await invitationRepo.addMemberDirectly(
        workspaceId,
        existingUser.id,
        body.role || 'member'
      )

      if (isError(addResult)) {
        return databaseErrorResponse(addResult.error.message, addResult.error.details)
      }

      return successResponse({ message: 'Member added successfully' })
    }

    // User doesn't exist - create invitation
    const inviteResult = await invitationRepo.createInvitation(
      workspaceId,
      body.email,
      body.role || 'member',
      user.id,
      body.message
    )

    if (isError(inviteResult)) {
      if (inviteResult.error.code === 'DUPLICATE_INVITATION') {
        return conflictResponse('An invitation has already been sent to this email', { email: body.email })
      }
      return databaseErrorResponse(inviteResult.error.message, inviteResult.error.details)
    }

    return successResponse({
      message: 'Invitation sent successfully',
      invitation: inviteResult.data
    })
  } catch (err) {
    console.error('Invitation creation error:', err)
    return databaseErrorResponse('Failed to create invitation', err)
  }
}
