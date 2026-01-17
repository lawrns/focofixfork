import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'

import { cachedFetch } from '@/lib/cache/redis'
import { CACHE_TTL, CACHE_KEYS } from '@/lib/cache/cache-config'

export const dynamic = 'force-dynamic'

/**
 * GET /api/workspaces/[id]/members
 * Fetches all members for a specific workspace
 * OPTIMIZED: Fixed N+1 query problem with single JOIN query + caching
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, supabase, error: authError, response: authResponse } = await getAuthUser(request)

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', success: false },
        { status: 401 }
      )
    }

    const { id: workspaceId } = params
    const cacheKey = CACHE_KEYS.WORKSPACE_MEMBERS(workspaceId)

    const membersWithDetails = await cachedFetch(
      cacheKey,
      async () => {
        // OPTIMIZATION: Single query with JOIN instead of N+1 queries
        // Use LEFT JOIN (no !inner) to include members even if they lack a profile
        const { data: members, error: membersError } = await supabase
          .from('workspace_members')
          .select(`
            id,
            user_id,
            role,
            capacity_hours_per_week,
            focus_hours_per_day,
            timezone,
            settings,
            created_at,
            updated_at,
            user_profiles (
              id,
              full_name,
              avatar_url,
              email
            )
          `)
          .eq('workspace_id', workspaceId)
          .order('created_at', { ascending: true })

        if (membersError) {
          console.error('Error fetching workspace members:', membersError)
          throw new Error('Failed to fetch members')
        }

        // Transform the joined data - profile data comes from LEFT JOIN
        return members?.map(member => {
          const profile = Array.isArray(member.user_profiles)
            ? member.user_profiles[0]
            : member.user_profiles

          return {
            id: member.id,
            user_id: member.user_id,
            role: member.role,
            capacity_hours_per_week: member.capacity_hours_per_week,
            focus_hours_per_day: member.focus_hours_per_day,
            timezone: member.timezone,
            settings: member.settings,
            created_at: member.created_at,
            updated_at: member.updated_at,
            user: {
              id: member.user_id,
              email: profile?.email || '',
              full_name: profile?.full_name || '',
              avatar_url: profile?.avatar_url || '',
            },
            email: profile?.email || '',
            user_name: profile?.full_name || profile?.email?.split('@')[0] || 'Unknown User',
          }
        }) || []
      },
      { ttl: CACHE_TTL.WORKSPACE_MEMBERS }
    )

    const successRes = NextResponse.json({
      success: true,
      data: membersWithDetails,
    })
    return mergeAuthResponse(successRes, authResponse)
  } catch (error) {
    console.error('Workspace members fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    )
  }
}
