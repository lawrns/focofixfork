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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, supabase, error: authError, response: authResponse } = await getAuthUser(request)

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', success: false },
        { status: 401 }
      )
    }

    const { id: workspaceId } = await params
    const cacheKey = CACHE_KEYS.WORKSPACE_MEMBERS(workspaceId)

    const membersWithDetails = await cachedFetch(
      cacheKey,
      async () => {
        // Step 1: Fetch workspace members
        const { data: members, error: membersError } = await supabase
          .from('foco_workspace_members')
          .select('id, user_id, role, capacity_hours_per_week, focus_hours_per_day, timezone, settings, created_at, updated_at')
          .eq('workspace_id', workspaceId)
          .order('created_at', { ascending: true })

        if (membersError) {
          throw new Error('Failed to fetch members')
        }

        if (!members || members.length === 0) return []

        // Step 2: Fetch profiles for those users (user_profiles.id = auth.users.id)
        const userIds = members.map(m => m.user_id)
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('id, display_name')
          .in('id', userIds)

        const profileMap: Record<string, string> = {}
        for (const p of profiles ?? []) {
          profileMap[p.id] = p.display_name || ''
        }

        return members.map(member => ({
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
            email: '',
            full_name: profileMap[member.user_id] || '',
            avatar_url: '',
          },
          email: '',
          user_name: profileMap[member.user_id] || 'Unknown User',
        }))
      },
      { ttl: CACHE_TTL.WORKSPACE_MEMBERS }
    )

    const successRes = NextResponse.json({
      success: true,
      data: membersWithDetails,
    })
    return mergeAuthResponse(successRes, authResponse)
  } catch {
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    )
  }
}
