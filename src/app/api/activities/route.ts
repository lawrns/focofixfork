import { NextRequest } from 'next/server'
import { wrapRoute } from '@/server/http/wrapRoute'
import { GetActivitiesSchema } from '@/lib/validation/schemas/activity-api.schema'
import { supabaseAdmin } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  return wrapRoute(GetActivitiesSchema, async ({ input, user, correlationId }) => {
    const projectId = input.query?.project_id
    const organizationId = input.query?.organization_id
    const limit = input.query?.limit || 20
    const offset = input.query?.offset || 0

    // Build query for activities
    let query = supabaseAdmin
      .from('activities')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)
      .range(offset, offset + limit - 1)

    // Filter by project if specified
    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    // Filter by organization if specified
    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    }

    // If no filters, get activities for user's projects/organizations
    if (!projectId && !organizationId) {
      // Get user's organization IDs
      const { data: userOrgs } = await supabaseAdmin
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)

      const orgIds = Array.isArray(userOrgs) ? userOrgs.map(org => org.organization_id) : []

      if (orgIds.length > 0) {
        query = query.in('organization_id', orgIds)
      } else {
        // User has no organizations, return empty
        return []
      }
    }

    const { data: activities, error } = await query

    if (error) {
      const err: any = new Error('Failed to fetch activities')
      err.code = 'DATABASE_ERROR'
      err.statusCode = 500
      throw err
    }

    return activities || []
  })(request)
}
