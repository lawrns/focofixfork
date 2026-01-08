import { NextRequest } from 'next/server'
import { wrapRoute } from '@/server/http/wrapRoute'
import { InviteMemberSchema } from '@/lib/validation/schemas/organization-api.schema'
import { checkRateLimit } from '@/server/utils/rateLimit'
import { supabaseAdmin } from '@/lib/supabase-server'
import { ForbiddenError } from '@/server/auth/requireAuth'

// CONSOLIDATE: Merge into /api/organizations/[id]/invitations
// This route is deprecated. Use POST /api/organizations/[id]/invitations instead.
// Migration: POST /api/organizations/[orgId]/invitations (requires orgId in path)

/**
 * POST /api/organization/invite - Invite a member to an organization
 * Rate limited: 20 invites per hour per user
 */
export async function POST(request: NextRequest) {
  return wrapRoute(InviteMemberSchema, async ({ input, user, req, correlationId }) => {
    // Rate limit: 20 invites per hour to prevent abuse
    await checkRateLimit(user.id, req.headers.get('x-forwarded-for'), 'auth')

    const { organizationId, email, role } = input.body

    // Check if current user is an admin of this organization
    const { data: currentUserMember, error: memberError } = await supabaseAdmin
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .single()

    if (memberError || !currentUserMember) {
      const err: any = new Error('Organization not found')
      err.code = 'ORGANIZATION_NOT_FOUND'
      err.statusCode = 404
      throw err
    }

    // Only admins can invite members
    if (currentUserMember.role !== 'admin' && currentUserMember.role !== 'owner') {
      throw new ForbiddenError('Only organization admins can invite members')
    }

    // Generate temporary password
    const tempPassword = `Temp${Math.random().toString(36).slice(-8)}!`

    // Check if user already exists in users table
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    let invitedUserId: string

    if (existingUser) {
      invitedUserId = existingUser.id
    } else {
      // Create new user in Supabase Auth
      const { data: authData, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          display_name: email.split('@')[0]
        }
      })

      if (createAuthError) {
        const err: any = new Error('Failed to create user account')
        err.code = 'USER_CREATE_FAILED'
        err.statusCode = 500
        throw err
      }

      invitedUserId = authData.user.id

      // Create user in users table
      const { error: userError } = await supabaseAdmin
        .from('users')
        .insert({
          id: invitedUserId,
          email,
          full_name: email.split('@')[0],
          is_active: true
        })

      if (userError) {
        console.error('Error creating user record:', userError)
      }

      // Create user profile
      const { error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .insert({
          id: invitedUserId,
          user_id: invitedUserId,
          organization_id: organizationId
        })

      if (profileError) {
        console.error('Error creating user profile:', profileError)
      }
    }

    // Check if user is already a member
    const { data: existingMember } = await supabaseAdmin
      .from('organization_members')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('user_id', invitedUserId)
      .single()

    if (existingMember) {
      const err: any = new Error('User is already a member of this organization')
      err.code = 'ALREADY_MEMBER'
      err.statusCode = 400
      throw err
    }

    // Add user to organization
    const { error: addMemberError } = await supabaseAdmin
      .from('organization_members')
      .insert({
        organization_id: organizationId,
        user_id: invitedUserId,
        role,
        is_active: true
      })

    if (addMemberError) {
      const err: any = new Error('Failed to add member to organization')
      err.code = 'DATABASE_ERROR'
      err.statusCode = 500
      throw err
    }

    // Send welcome email (async, don't block response)
    fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/send-welcome`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-correlation-id': correlationId
      },
      body: JSON.stringify({
        email,
        name: email.split('@')[0],
        password: tempPassword,
        organization: 'Your Organization'
      })
    }).catch(err => console.error('Error sending welcome email:', err))

    return {
      message: `Invitation sent to ${email}`,
      userId: invitedUserId
      // SECURITY: Never return password in production response
    }
  })(request)
}
