import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = supabaseAdmin
    
    // Get current user
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get user's organization
    const { data: orgMember, error: orgError } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', userId)
      .single()

    if (orgError || !orgMember) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // Get all members of the organization
    const { data: members, error: membersError } = await supabase
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
      console.error('Error fetching members:', membersError)
      return NextResponse.json(
        { error: 'Failed to fetch members' },
        { status: 500 }
      )
    }

    // Get user details for each member
    const memberIds = members.map(m => m.user_id)
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, full_name, avatar_url')
      .in('id', memberIds)

    if (usersError) {
      console.error('Error fetching user details:', usersError)
    }

    // Combine member data with user details
    const enrichedMembers = members.map(member => {
      const userDetails = users?.find(u => u.id === member.user_id)
      return {
        ...member,
        email: userDetails?.email || '',
        full_name: userDetails?.full_name || '',
        avatar_url: userDetails?.avatar_url || null
      }
    })

    return NextResponse.json({ members: enrichedMembers })

  } catch (error) {
    console.error('Error in GET /api/organization/members:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

