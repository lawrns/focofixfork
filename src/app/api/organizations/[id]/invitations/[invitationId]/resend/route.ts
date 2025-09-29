import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { EmailService } from '@/lib/services/email'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; invitationId: string } }
) {
  try {
    // Extract user ID from headers (set by middleware)
    let userId = request.headers.get('x-user-id')

    const body = await request.json()
    const { userId: bodyUserId } = body

    // Fallback to userId from request body if header is not set
    if (!userId && bodyUserId) {
      userId = bodyUserId
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { id: organizationId, invitationId } = params

    // Get invitation details
    const { data: invitation, error: inviteError } = await supabaseAdmin
      .from('organization_invitations')
      .select('*')
      .eq('id', invitationId)
      .eq('organization_id', organizationId)
      .single()

    if (inviteError || !invitation) {
      return NextResponse.json(
        { success: false, error: 'Invitation not found' },
        { status: 404 }
      )
    }

    // Check if user has permission (is member of organization)
    const { data: memberCheck } = await supabaseAdmin
      .from('organization_members')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .single()

    if (!memberCheck) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      )
    }

    // Check if invitation is still valid
    if (invitation.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: 'Invitation is no longer pending' },
        { status: 400 }
      )
    }

    // Check if expired
    if (new Date(invitation.expires_at) < new Date()) {
      // Update status to expired
      await supabaseAdmin
        .from('organization_invitations')
        .update({ status: 'expired' })
        .eq('id', invitationId)

      return NextResponse.json(
        { success: false, error: 'Invitation has expired' },
        { status: 410 }
      )
    }

    // Get organization and inviter details
    const { data: orgData, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('name')
      .eq('id', organizationId)
      .single()

    const { data: inviterData, error: inviterError } = await supabaseAdmin
      .from('profiles')
      .select('full_name, email')
      .eq('id', invitation.invited_by)
      .single()

    const inviterName = inviterData?.full_name || inviterData?.email || 'Someone'

    // Resend email
    const emailResult = await EmailService.sendInvitationEmail(
      invitation.email,
      orgData?.name || 'Organization',
      inviterName,
      invitation.token,
      invitation.role
    )

    if (!emailResult.success) {
      console.error('Email resend failed:', emailResult.error)
      return NextResponse.json(
        { success: false, error: 'Failed to resend invitation email' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Invitation email resent successfully'
    })
  } catch (error) {
    console.error('Resend invitation API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}