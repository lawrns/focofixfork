import { NextRequest } from 'next/server'
import { wrapRoute } from '@/server/http/wrapRoute'
import { GetOrgInvitationsSchema, CreateOrgInvitationSchema } from '@/lib/validation/schemas/organization-api.schema'
import { checkRateLimit } from '@/server/utils/rateLimit'
import { OrganizationsService } from '@/lib/services/organizations'

interface RouteContext {
  params: {
    id: string
  }
}

/**
 * GET /api/organizations/[id]/invitations - Get organization invitations
 */
export async function GET(request: NextRequest, context: RouteContext) {
  return wrapRoute(GetOrgInvitationsSchema, async ({ user, correlationId }) => {
    const organizationId = context.params.id

    const result = await OrganizationsService.getOrganizationInvitations(organizationId)

    if (!result.success) {
      const err: any = new Error(result.error || 'Failed to fetch invitations')
      err.code = 'DATABASE_ERROR'
      err.statusCode = 400
      throw err
    }

    return result.data
  })(request)
}

/**
 * POST /api/organizations/[id]/invitations - Create organization invitation
 * Rate limited: 20 invitations per hour
 */
export async function POST(request: NextRequest, context: RouteContext) {
  return wrapRoute(CreateOrgInvitationSchema, async ({ input, user, req, correlationId }) => {
    const organizationId = context.params.id

    // Rate limit invitations to prevent abuse
    await checkRateLimit(user.id, req.headers.get('x-forwarded-for'), 'auth')

    const result = await OrganizationsService.inviteMember(organizationId, user.id, {
      email: input.body.email,
      role: input.body.role
    })

    if (!result.success) {
      const err: any = new Error(result.error || 'Failed to create invitation')
      err.code = 'INVITATION_FAILED'
      err.statusCode = 400
      throw err
    }

    if (!result.data?.invitation_sent) {
      const err: any = new Error(result.data?.message || 'Failed to send invitation')
      err.code = 'EMAIL_SEND_FAILED'
      err.statusCode = 400
      throw err
    }

    return result.data
  })(request)
}
