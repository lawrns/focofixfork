import { NextRequest } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'

import { WorkspaceRepository } from '@/lib/repositories/workspace-repository'
import { isError } from '@/lib/repositories/base-repository'
import {
  authRequiredResponse,
  successResponse,
  workspaceAccessDeniedResponse,
  databaseErrorResponse,
  internalErrorResponse
} from '@/lib/api/response-helpers'

export const dynamic = 'force-dynamic'

/**
 * GET /api/organizations/[id]/members
 * Fetches all members for a workspace (organization)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, supabase, error: authError, response: authResponse } = await getAuthUser(request)

    if (authError || !user) {
      return authRequiredResponse()
    }

    const workspaceId = params.id
    const repo = new WorkspaceRepository(supabase)

    // Verify user has access to this workspace
    const membershipResult = await repo.isMember(workspaceId, user.id)

    if (isError(membershipResult)) {
      console.error('Error checking workspace membership:', membershipResult.error)
      const errorRes = databaseErrorResponse(membershipResult.error.message, membershipResult.error.details)
      return mergeAuthResponse(errorRes, authResponse)
    }

    if (!membershipResult.data) {
      return mergeAuthResponse(workspaceAccessDeniedResponse(workspaceId), authResponse)
    }

    // Fetch all workspace members
    const membersResult = await repo.getMembers(workspaceId)

    if (isError(membersResult)) {
      console.error('Error fetching workspace members:', membersResult.error)
      const errorRes = databaseErrorResponse(membersResult.error.message, membersResult.error.details)
      return mergeAuthResponse(errorRes, authResponse)
    }

    const members = membersResult.data
    const memberIds = members.map(m => m.user_id)

    // Get user profiles
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, full_name, avatar_url, email')
      .in('id', memberIds)

    // Get user emails from auth (if not in profiles)
    const { data: { users: authUsers } } = await supabase.auth.admin.listUsers()
    const authUserMap = new Map<string, any>(authUsers?.map(u => [u.id, u] as [string, any]) || [])

    // Combine member data with user details
    const membersWithDetails = members.map(member => {
      const profile = profiles?.find(p => p.id === member.user_id)
      const authUser = authUserMap.get(member.user_id)

      return {
        ...member,
        user: {
          id: member.user_id,
          email: profile?.email || authUser?.email || '',
          full_name: profile?.full_name || '',
          avatar_url: profile?.avatar_url || '',
        },
        email: profile?.email || authUser?.email || '',
        user_name: profile?.full_name || authUser?.email?.split('@')[0] || 'Unknown User',
      }
    })

    const successRes = successResponse(membersWithDetails)
    return mergeAuthResponse(successRes, authResponse)
  } catch (error) {
    console.error('Workspace members fetch error:', error)
    return internalErrorResponse('Failed to fetch workspace members', error)
  }
}
