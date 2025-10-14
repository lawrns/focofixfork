import { NextRequest } from 'next/server'
import { wrapRoute } from '@/server/http/wrapRoute'
import { AcceptInvitationSchema } from '@/lib/validation/schemas/invitation-api.schema'
import { supabaseAdmin } from '@/lib/supabase-server'

interface RouteContext {
  params: {
    token: string
  }
}

/**
 * POST /api/invitations/[token]/accept - Accept an organization invitation
 */
export async function POST(request: NextRequest, context: RouteContext) {
  return wrapRoute(AcceptInvitationSchema, async ({ user, correlationId }) => {
    const { token } = context.params

    // Get invitation
    const { data: invitation, error: inviteError } = await supabaseAdmin
      .from('organization_invitations')
      .select('*')
      .eq('token', token)
      .eq('status', 'pending')
      .single()

    if (inviteError || !invitation) {
      const err: any = new Error('Invitation not found')
      err.code = 'INVITATION_NOT_FOUND'
      err.statusCode = 404
      throw err
    }

    // Check if expired
    if (new Date(invitation.expires_at) < new Date()) {
      await supabaseAdmin
        .from('organization_invitations')
        .update({ status: 'expired' })
        .eq('token', token)

      const err: any = new Error('Invitation has expired')
      err.code = 'INVITATION_EXPIRED'
      err.statusCode = 410
      throw err
    }

    // Check if user already exists in organization
    const { data: existingMember } = await supabaseAdmin
      .from('organization_members')
      .select('id')
      .eq('organization_id', invitation.organization_id)
      .eq('user_id', user.id)
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

      return {
        message: 'You are already a member of this organization'
      }
    }

    // Add user to organization
    const { error: memberError } = await supabaseAdmin
      .from('organization_members')
      .insert({
        organization_id: invitation.organization_id,
        user_id: user.id,
        role: invitation.role,
        joined_at: new Date().toISOString()
      })

    if (memberError) {
      const err: any = new Error('Failed to add member to organization')
      err.code = 'DATABASE_ERROR'
      err.statusCode = 500
      throw err
    }

    // Update invitation status
    await supabaseAdmin
      .from('organization_invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString()
      })
      .eq('token', token)

    return {
      message: 'Successfully joined organization!',
      organization_id: invitation.organization_id
    }
  })(request)
}
