import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
export const dynamic = 'force-dynamic'


export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('project_id')
    const organizationId = searchParams.get('organization_id')
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

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
        .eq('user_id', userId)

      const orgIds = Array.isArray(userOrgs) ? userOrgs.map(org => org.organization_id) : []

      if (orgIds.length > 0) {
        query = query.in('organization_id', orgIds)
      } else {
        // User has no organizations, return empty
        return NextResponse.json({
          success: true,
          data: [],
        })
      }
    }

    const { data: activities, error } = await query

    if (error) {
      console.error('Error fetching activities:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch activities' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: activities || [],
    })
  } catch (error: any) {
    console.error('Activities API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
