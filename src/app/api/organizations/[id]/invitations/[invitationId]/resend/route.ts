import { NextRequest } from 'next/server'
import { wrapRoute } from '@/server/http/wrapRoute'
import { ResendInvitationSchema } from '@/lib/validation/schemas/organization-api.schema'
import { checkRateLimit } from '@/server/utils/rateLimit'
import { supabaseAdmin } from '@/lib/supabase-server'
import { EmailService } from '@/lib/services/email'
import { ForbiddenError } from '@/server/auth/requireAuth'

interface RouteContext {
  params: {
    id: string
    invitationId: string
  }
}

/**
 * POST /api/organizations/[id]/invitations/[invitationId]/resend - Resend invitation email
 * Rate limited: 5 resends per 15 minutes to prevent abuse
 */
export async function POST(request: NextRequest, context: RouteContext) {
  return wrapRoute(ResendInvitationSchema, async ({ user, req, correlationId }) => {
    const { id: organizationId, invitationId } = context.params

    // Rate limit resends to prevent spam
    await checkRateLimit(user.id, req.headers.get('x-forwarded-for'), 'auth')

    // Get invitation details
    const { data: invitation, error: inviteError } = await supabaseAdmin
      .from('organization_invitations')
      .select('*')
      .eq('id', invitationId)
      .eq('organization_id', organizationId)
      .single()

    if (inviteError || !invitation) {
      const err: any = new Error('Invitation not found')
      err.code = 'INVITATION_NOT_FOUND'
      err.statusCode = 404
      throw err
    }

    // Check if user has permission (is member of organization)
    const { data: memberCheck } = await supabaseAdmin
      .from('organization_members')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .single()

    if (!memberCheck) {
      throw new ForbiddenError('You do not have permission to resend invitations for this organization')
    }

    // Check if invitation is still valid
    if (invitation.status !== 'pending') {
      const err: any = new Error('Invitation is no longer pending')
      err.code = 'INVITATION_NOT_PENDING'
      err.statusCode = 400
      throw err
    }

    // Check if expired
    if (new Date(invitation.expires_at) < new Date()) {
      // Update status to expired
      await supabaseAdmin
        .from('organization_invitations')
        .update({ status: 'expired' })
        .eq('id', invitationId)

      const err: any = new Error('Invitation has expired')
      err.code = 'INVITATION_EXPIRED'
      err.statusCode = 410
      throw err
    }

    // Get organization details
    const { data: orgData } = await supabaseAdmin
      .from('organizations')
      .select('name')
      .eq('id', organizationId)
      .single()

    // Get inviter details
    const { data: inviterData } = await supabaseAdmin
      .from('users')
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
      const err: any = new Error('Failed to resend invitation email')
      err.code = 'EMAIL_SEND_FAILED'
      err.statusCode = 500
      throw err
    }

    return {
      message: 'Invitation email resent successfully'
    }
  })(request)
}
