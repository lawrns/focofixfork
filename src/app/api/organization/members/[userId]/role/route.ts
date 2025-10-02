import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: {
    userId: string
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createClient()
    const { role } = await request.json()

    if (!role || !['owner', 'member'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be "owner" or "member"' },
        { status: 400 }
      )
    }

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get current user's organization and role
    const { data: currentUserMember, error: currentUserError } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .single()

    if (currentUserError || !currentUserMember) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // Only owners can change roles
    if (currentUserMember.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only organization owners can change member roles' },
        { status: 403 }
      )
    }

    // Update the member's role
    const { error: updateError } = await supabase
      .from('organization_members')
      .update({ role })
      .eq('user_id', params.userId)
      .eq('organization_id', currentUserMember.organization_id)

    if (updateError) {
      console.error('Error updating role:', updateError)
      return NextResponse.json(
        { error: 'Failed to update role' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true,
      message: `Role updated to ${role}` 
    })

  } catch (error) {
    console.error('Error in PATCH /api/organization/members/[userId]/role:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

