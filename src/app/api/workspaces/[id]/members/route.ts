import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * GET /api/workspaces/[id]/members
 * Fetches all members for a specific workspace
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get('sb-token')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized', success: false },
        { status: 401 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Failed to get user', success: false },
        { status: 401 }
      )
    }

    // Fetch workspace members with user details
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
        updated_at
      `)
      .eq('workspace_id', params.id)
      .order('created_at', { ascending: true })

    if (membersError) {
      console.error('Error fetching workspace members:', membersError)
      return NextResponse.json(
        { error: 'Failed to fetch members', success: false },
        { status: 500 }
      )
    }

    // Fetch user details for each member from auth.users
    const memberIds = members?.map(m => m.user_id) || []

    // Get user profiles
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, full_name, avatar_url, email')
      .in('id', memberIds)

    // Get user emails from auth (if not in profiles)
    const { data: { users: authUsers } } = await supabase.auth.admin.listUsers()
    const authUserMap = new Map(authUsers?.map(u => [u.id, u]) || [])

    // Combine member data with user details
    const membersWithDetails = members?.map(member => {
      const profile = profiles?.find(p => p.id === member.user_id)
      const authUser = authUserMap.get(member.user_id)

      return {
        ...member,
        user: {
          id: member.user_id,
          email: profile?.email || authUser?.email || '',
          full_name: profile?.full_name || '',
          avatar_url: profile?.avatar_url || '',
        },
        email: profile?.email || authUser?.email || '',
        user_name: profile?.full_name || authUser?.email?.split('@')[0] || 'Unknown User',
      }
    }) || []

    return NextResponse.json({
      success: true,
      data: membersWithDetails,
    })
  } catch (error) {
    console.error('Workspace members fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    )
  }
}
