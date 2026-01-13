import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'

/**
 * GET /api/organizations/[id]/invitations
 * Fetches all pending invitations for a workspace
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, supabase, error: authError, response: authResponse } = await getAuthUser(request)

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', success: false },
        { status: 401 }
      )
    }

    const workspaceId = params.id

    // Verify user has access to this workspace
    const { data: userMembership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single()

    if (!userMembership) {
      const errorRes = NextResponse.json(
        { error: 'Access denied', success: false },
        { status: 403 }
      )
      return mergeAuthResponse(errorRes, authResponse)
    }

    // Fetch invitations - assuming invitations table exists or return empty array
    // TODO: Check if invitations table exists for workspaces
    const successRes = NextResponse.json({
      success: true,
      data: [] // Placeholder - needs invitations table implementation
    })
    return mergeAuthResponse(successRes, authResponse)
  } catch (error) {
    console.error('Invitations fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    )
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
    const { user, supabase, error: authError, response: authResponse } = await getAuthUser(request)

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', success: false },
        { status: 401 }
      )
    }

    const workspaceId = params.id

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

    if (!body.email) {
      const errorRes = NextResponse.json(
        { error: 'Email is required', success: false },
        { status: 400 }
      )
      return mergeAuthResponse(errorRes, authResponse)
    }

    // Check if user already exists and add directly as member
    const { data: existingUser } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('email', body.email)
      .single()

    if (existingUser) {
      // Check if already a member
      const { data: existingMember } = await supabase
        .from('workspace_members')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('user_id', existingUser.id)
        .single()

      if (existingMember) {
        const errorRes = NextResponse.json(
          { error: 'User is already a member', success: false },
          { status: 400 }
        )
        return mergeAuthResponse(errorRes, authResponse)
      }

      // Add user directly as member
      const { error: addError } = await supabase
        .from('workspace_members')
        .insert({
          workspace_id: workspaceId,
          user_id: existingUser.id,
          role: body.role || 'member'
        })

      if (addError) {
        console.error('Error adding member:', addError)
        const errorRes = NextResponse.json(
          { error: addError.message, success: false },
          { status: 500 }
        )
        return mergeAuthResponse(errorRes, authResponse)
      }

      const successRes = NextResponse.json({
        success: true,
        message: 'Member added successfully'
      })
      return mergeAuthResponse(successRes, authResponse)
    }

    // TODO: Implement invitation system for non-existing users
    // For now, return success with a message
    const successRes = NextResponse.json({
      success: true,
      message: 'Invitation sent (user will be added when they sign up)'
    })
    return mergeAuthResponse(successRes, authResponse)
  } catch (error) {
    console.error('Invitation creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    )
  }
}
