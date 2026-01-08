import { NextRequest } from 'next/server'
import { wrapRoute } from '@/server/http/wrapRoute'
import { ListOrganizationMembersSchema } from '@/lib/validation/schemas/organization-api.schema'
import { supabaseAdmin } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

// CONSOLIDATE: Merge into /api/organizations/[id]/members
// This route is deprecated. Use the standardized /api/organizations/[id]/members endpoint instead.
// Migration: GET /api/organizations/[orgId]/members (requires orgId in path)

/**
 * GET /api/organization/members - List members of user's organization
 * PII minimization: Emails visible only to admins
 */
export async function GET(request: NextRequest) {
  return wrapRoute(ListOrganizationMembersSchema, async ({ user, correlationId }) => {
    // Get user's organization membership
    const { data: orgMember, error: orgError } = await supabaseAdmin
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .single()

    if (orgError || !orgMember) {
      const err: any = new Error('Organization not found')
      err.code = 'ORGANIZATION_NOT_FOUND'
      err.statusCode = 404
      throw err
    }

    const isAdmin = orgMember.role === 'admin' || orgMember.role === 'owner'

    // Get all members of the organization
    const { data: members, error: membersError } = await supabaseAdmin
      .from('organization_members')
      .select(`
        id,
        user_id,
        role,
        is_active,
        joined_at
      `)
      .eq('organization_id', orgMember.organization_id)
      .order('joined_at', { ascending: false })

    if (membersError) {
      const err: any = new Error('Failed to fetch members')
      err.code = 'DATABASE_ERROR'
      err.statusCode = 500
      throw err
    }

    // Get user details for each member
    const memberIds = Array.isArray(members) ? members.map(m => m.user_id) : []

    // PII minimization: Only fetch email if requester is admin
    const selectFields = isAdmin
      ? 'id, email, full_name, avatar_url'
      : 'id, full_name, avatar_url'

    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select(selectFields)
      .in('id', memberIds)

    if (usersError) {
      console.error('Error fetching user details:', usersError)
    }

    // Combine member data with user details
    const enrichedMembers = Array.isArray(members)
      ? members.map(member => {
          const userDetails = (users as any)?.find((u: any) => u.id === member.user_id)
          return {
            ...member,
            // PII: Only include email for admins
            ...(isAdmin && userDetails && 'email' in userDetails ? { email: userDetails.email } : {}),
            full_name: userDetails?.full_name || '',
            avatar_url: userDetails?.avatar_url || null
          }
        })
      : []

    return {
      members: enrichedMembers,
      organizationId: orgMember.organization_id
    }
  })(request)
}
