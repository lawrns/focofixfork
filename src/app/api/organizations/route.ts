import { NextRequest } from 'next/server'
import { wrapRoute } from '@/server/http/wrapRoute'
import { GetOrganizationsSchema, CreateOrganizationApiSchema } from '@/lib/validation/schemas/organization-api.schema'
import { OrganizationsService } from '@/lib/services/organizations'

// Ensure Node runtime for Netlify compatibility
export const runtime = 'nodejs'

/**
 * GET /api/organizations - List user's organizations
 */
export async function GET(request: NextRequest) {
  return wrapRoute(GetOrganizationsSchema, async ({ user, correlationId }) => {
    const result = await OrganizationsService.getUserOrganizations(user.id, user.supabase)

    if (!result.success) {
      const err: any = new Error(result.error || 'Failed to fetch organizations')
      err.code = 'DATABASE_ERROR'
      err.statusCode = 500
      throw err
    }

    return result.data
  })(request)
}

/**
 * POST /api/organizations - Create a new organization
 */
export async function POST(request: NextRequest) {
  return wrapRoute(CreateOrganizationApiSchema, async ({ input, user, correlationId }) => {
    const result = await OrganizationsService.createOrganization({
      name: input.body.name,
      description: input.body.description,
      created_by: user.id
    }, user.supabase)

    if (!result.success) {
      const err: any = new Error(result.error || 'Failed to create organization')
      err.code = 'DATABASE_ERROR'
      err.statusCode = 500
      throw err
    }

    return result.data
  })(request)
}
