import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params

    // SECURITY FIX: Get userId from authenticated session, not request body
    const userId = request.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get invitation
    const { data: invitation, error: inviteError } = await supabaseAdmin
      .from('organization_invitations')
      .select('*')
      .eq('token', token)
      .eq('status', 'pending')
      .single()

    if (inviteError || !invitation) {
      return NextResponse.json(
        { success: false, error: 'Invitation not found' },
        { status: 404 }
      )
    }

    // Check if expired
    if (new Date(invitation.expires_at) < new Date()) {
      await supabaseAdmin
        .from('organization_invitations')
        .update({ status: 'expired' })
        .eq('token', token)

      return NextResponse.json(
        { success: false, error: 'Invitation has expired' },
        { status: 410 }
      )
    }

    // Check if user already exists in organization
    const { data: existingMember } = await supabaseAdmin
      .from('organization_members')
      .select('id')
      .eq('organization_id', invitation.organization_id)
      .eq('user_id', userId)
      .single()

    if (existingMember) {
      // Update invitation status
      await supabaseAdmin
        .from('organization_invitations')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString()
        })
        .eq('token', token)

      return NextResponse.json({
        success: true,
        data: { message: 'You are already a member of this organization' }
      })
    }

    // Add user to organization
    const { error: memberError } = await supabaseAdmin
      .from('organization_members')
      .insert({
        organization_id: invitation.organization_id,
        user_id: userId,
        role: invitation.role,
        joined_at: new Date().toISOString()
      })

    if (memberError) {
      console.error('Add member error:', memberError)
      return NextResponse.json(
        { success: false, error: 'Failed to add member to organization' },
        { status: 500 }
      )
    }

    // Update invitation status
    await supabaseAdmin
      .from('organization_invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString()
      })
      .eq('token', token)

    return NextResponse.json({
      success: true,
      data: {
        message: 'Successfully joined organization!',
        organization_id: invitation.organization_id
      }
    })
  } catch (error) {
    console.error('Accept invitation error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}