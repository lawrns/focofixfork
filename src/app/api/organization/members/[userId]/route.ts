import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

interface RouteParams {
  params: {
    userId: string
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = supabaseAdmin

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

    // Only owners can remove members
    if (currentUserMember.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only organization owners can remove members' },
        { status: 403 }
      )
    }

    // Prevent removing yourself
    if (params.userId === user.id) {
      return NextResponse.json(
        { error: 'You cannot remove yourself from the organization' },
        { status: 400 }
      )
    }

    // Remove the member from the organization
    const { error: deleteError } = await supabase
      .from('organization_members')
      .delete()
      .eq('user_id', params.userId)
      .eq('organization_id', currentUserMember.organization_id)

    if (deleteError) {
      console.error('Error removing member:', deleteError)
      return NextResponse.json(
        { error: 'Failed to remove member' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true,
      message: 'Member removed successfully' 
    })

  } catch (error) {
    console.error('Error in DELETE /api/organization/members/[userId]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

