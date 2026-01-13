import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'

/**
 * PATCH /api/organizations/[id]/members/[memberId]
 * Updates a member's role in the workspace
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; memberId: string } }
) {
  try {
    const { user, supabase, error: authError, response: authResponse } = await getAuthUser(request)

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', success: false },
        { status: 401 }
      )
    }

    const { id: workspaceId, memberId } = params

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

    const body = await request.json()

    if (!body.role) {
      const errorRes = NextResponse.json(
        { error: 'Role is required', success: false },
        { status: 400 }
      )
      return mergeAuthResponse(errorRes, authResponse)
    }

    // Update member role
    const { error: updateError } = await supabase
      .from('workspace_members')
      .update({ role: body.role })
      .eq('id', memberId)
      .eq('workspace_id', workspaceId)

    if (updateError) {
      console.error('Error updating member role:', updateError)
      const errorRes = NextResponse.json(
        { error: updateError.message, success: false },
        { status: 500 }
      )
      return mergeAuthResponse(errorRes, authResponse)
    }

    const successRes = NextResponse.json({
      success: true,
      message: 'Member role updated successfully'
    })
    return mergeAuthResponse(successRes, authResponse)
  } catch (error) {
    console.error('Member update error:', error)
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/organizations/[id]/members/[memberId]
 * Removes a member from the workspace
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; memberId: string } }
) {
  try {
    const { user, supabase, error: authError, response: authResponse } = await getAuthUser(request)

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', success: false },
        { status: 401 }
      )
    }

    const { id: workspaceId, memberId } = params

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

    // Prevent removing self
    const { data: memberToRemove } = await supabase
      .from('workspace_members')
      .select('user_id')
      .eq('id', memberId)
      .single()

    if (memberToRemove?.user_id === user.id) {
      const errorRes = NextResponse.json(
        { error: 'Cannot remove yourself', success: false },
        { status: 400 }
      )
      return mergeAuthResponse(errorRes, authResponse)
    }

    // Delete member
    const { error: deleteError } = await supabase
      .from('workspace_members')
      .delete()
      .eq('id', memberId)
      .eq('workspace_id', workspaceId)

    if (deleteError) {
      console.error('Error removing member:', deleteError)
      const errorRes = NextResponse.json(
        { error: deleteError.message, success: false },
        { status: 500 }
      )
      return mergeAuthResponse(errorRes, authResponse)
    }

    const successRes = NextResponse.json({
      success: true,
      message: 'Member removed successfully'
    })
    return mergeAuthResponse(successRes, authResponse)
  } catch (error) {
    console.error('Member deletion error:', error)
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    )
  }
}
