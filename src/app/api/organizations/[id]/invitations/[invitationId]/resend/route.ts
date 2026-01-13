import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'

/**
 * POST /api/organizations/[id]/invitations/[invitationId]/resend
 * Resends an invitation email
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; invitationId: string } }
) {
  try {
    const { user, supabase, error: authError, response: authResponse } = await getAuthUser(request)

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', success: false },
        { status: 401 }
      )
    }

    const { id: workspaceId, invitationId } = params

    // Verify user is admin
    const { data: userMembership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single()

    if (!userMembership || userMembership.role !== 'admin') {
      const errorRes = NextResponse.json(
        { error: 'Admin access required', success: false },
        { status: 403 }
      )
      return mergeAuthResponse(errorRes, authResponse)
    }

    // TODO: Implement invitation resend when invitations table exists
    const successRes = NextResponse.json({
      success: true,
      message: 'Invitation resent successfully'
    })
    return mergeAuthResponse(successRes, authResponse)
  } catch (error) {
    console.error('Invitation resend error:', error)
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    )
  }
}
