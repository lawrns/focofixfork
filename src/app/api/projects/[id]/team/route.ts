import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import {
  authRequiredResponse,
  successResponse,
  databaseErrorResponse,
  notFoundResponse,
  missingFieldResponse,
  conflictResponse
} from '@/lib/api/response-helpers'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { hasFounderFullAccess } from '@/lib/auth/founder-access'
import { accessFailureResponse, requireProjectAccess } from '@/server/auth/access'

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
    const { user, error, response: authResponse } = await getAuthUser(request)
    if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

    if (!hasFounderFullAccess(user)) {
      const access = await requireProjectAccess({ projectId })
      if (!access.ok) return accessFailureResponse(access)
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
      return successResponse([])
    }

    return successResponse(members || [])
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return databaseErrorResponse('Failed to fetch project team', message)
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
    const { user, error, response: authResponse } = await getAuthUser(request)
    if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

    if (!hasFounderFullAccess(user)) {
      const access = await requireProjectAccess({ projectId, minimumRole: 'admin' })
      if (!access.ok) return accessFailureResponse(access)
    }

    const body = await request.json()

    if (!body.email && !body.user_id) {
      return missingFieldResponse('email or user_id')
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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return databaseErrorResponse('Failed to add project member', message)
  }
}
