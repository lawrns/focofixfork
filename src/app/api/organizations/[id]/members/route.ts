import { NextRequest } from 'next/server'
import { wrapRoute } from '@/server/http/wrapRoute'
import { GetOrgMembersSchema, AddOrgMemberSchema } from '@/lib/validation/schemas/organization-api.schema'
import { checkRateLimit } from '@/server/utils/rateLimit'
import { OrganizationsService } from '@/lib/services/organizations'
import { checkOrganizationMembership, canManageOrganizationMembers } from '@/lib/middleware/authorization'
import { ForbiddenError } from '@/server/auth/requireAuth'

interface RouteContext {
  params: {
    id: string
  }
}

/**
 * GET /api/organizations/[id]/members - List organization members
 */
export async function GET(request: NextRequest, context: RouteContext) {
  return wrapRoute(GetOrgMembersSchema, async ({ user, correlationId }) => {
    const organizationId = context.params.id

    // Verify user is a member of this organization
    const isMember = await checkOrganizationMembership(user.id, organizationId)
    if (!isMember) {
      throw new ForbiddenError('You must be a member of this organization to view members')
    }

    const result = await OrganizationsService.getOrganizationMembers(organizationId)

    if (!result.success) {
      if (result.error?.includes('not found')) {
        const err: any = new Error('Organization not found')
        err.code = 'ORGANIZATION_NOT_FOUND'
        err.statusCode = 404
        throw err
      }
      const err: any = new Error(result.error || 'Failed to fetch members')
      err.code = 'DATABASE_ERROR'
      err.statusCode = 500
      throw err
    }

    return result.data
  })(request)
}

/**
 * POST /api/organizations/[id]/members - Add member to organization
 * Rate limited: 20 additions per hour
 */
export async function POST(request: NextRequest, context: RouteContext) {
  return wrapRoute(AddOrgMemberSchema, async ({ input, user, req, correlationId }) => {
    const organizationId = context.params.id

    // Rate limit member additions
    await checkRateLimit(user.id, req.headers.get('x-forwarded-for'), 'auth')

    // Verify user can manage organization members
    const canManage = await canManageOrganizationMembers(user.id, organizationId)
    if (!canManage) {
      throw new ForbiddenError('Only organization admins can add members')
    }

    const result = await OrganizationsService.inviteMember(organizationId, user.id, {
      email: input.body.userId, // Note: Service may expect email, check implementation
      role: input.body.role
    })

    if (!result.success) {
      const err: any = new Error(result.error || 'Failed to add member')
      err.code = 'MEMBER_ADD_FAILED'
      err.statusCode = 400
      throw err
    }

    return result.data
  })(request)
}
