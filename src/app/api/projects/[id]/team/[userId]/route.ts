import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'

// Schema for updating team member role
const updateTeamMemberSchema = z.object({
  role: z.enum(['admin', 'member', 'guest']),
})

interface RouteParams {
  params: {
    id: string
    userId: string
  }
}

/**
 * PUT /api/projects/[id]/team/[userId] - Update team member role
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    let currentUserId = request.headers.get('x-user-id')

    // For demo purposes, allow real user
    if (!currentUserId || currentUserId === 'demo-user-123') {
      currentUserId = '0c2af3ff-bd5e-4fbe-b8e2-b5b73266b562'
    }

    if (!currentUserId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const projectId = params.id
    const targetUserId = params.userId

    if (!projectId || !targetUserId) {
      return NextResponse.json(
        { success: false, error: 'Project ID and User ID are required' },
        { status: 400 }
      )
    }

    // Prevent users from modifying their own role
    if (currentUserId === targetUserId) {
      return NextResponse.json(
        { success: false, error: 'Cannot modify your own role' },
        { status: 403 }
      )
    }

    const body = await request.json()

    // Validate request body
    const validationResult = updateTeamMemberSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validationResult.error.issues
        },
        { status: 400 }
      )
    }

    // Check if the current user has permission to manage team member roles
    const { data: userRole, error: roleError } = await supabase
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', currentUserId)
      .single()

    if (roleError || !userRole) {
      // Check organization membership if not a direct project member
      const { data: orgData } = await supabase
        .from('projects')
        .select('organization_id')
        .eq('id', projectId)
        .single()

      if (orgData?.organization_id) {
        const { data: orgRole } = await supabase
          .from('organization_members')
          .select('role')
          .eq('organization_id', orgData.organization_id)
          .eq('user_id', currentUserId)
          .single()

        if (!orgRole || !['owner', 'admin'].includes(orgRole.role)) {
          return NextResponse.json(
            { success: false, error: 'You do not have permission to manage team member roles' },
            { status: 403 }
          )
        }
      } else {
        return NextResponse.json(
          { success: false, error: 'You do not have permission to manage team member roles' },
          { status: 403 }
        )
      }
    } else if (!['owner', 'admin'].includes(userRole.role)) {
      return NextResponse.json(
        { success: false, error: 'You do not have permission to manage team member roles' },
        { status: 403 }
      )
    }

    // Verify the target user is a team member of this project
    const { data: targetMember, error: memberError } = await supabase
      .from('project_members')
      .select('id, role')
      .eq('project_id', projectId)
      .eq('user_id', targetUserId)
      .single()

    if (memberError || !targetMember) {
      return NextResponse.json(
        { success: false, error: 'User is not a member of this project' },
        { status: 404 }
      )
    }

    // Prevent demoting the last owner/admin
    if (targetMember.role === 'owner' || targetMember.role === 'admin') {
      const { count: adminCount } = await supabase
        .from('project_members')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId)
        .in('role', ['owner', 'admin'])

      if (adminCount && adminCount <= 1) {
        return NextResponse.json(
          { success: false, error: 'Cannot change role of the last admin/owner' },
          { status: 400 }
        )
      }
    }

    // Update the team member role
    const { data: updatedMember, error: updateError } = await supabase
      .from('project_members')
      .update({ role: validationResult.data.role })
      .eq('project_id', projectId)
      .eq('user_id', targetUserId)
      .select(`
        id,
        user_id,
        role,
        added_by,
        added_at,
        auth.users!project_members_user_id_fkey (
          email,
          raw_user_meta_data
        )
      `)
      .single()

    if (updateError || !updatedMember) {
      console.error('Error updating team member role:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to update team member role' },
        { status: 500 }
      )
    }

    // Transform the response data
    const transformedMember = {
      id: (updatedMember as any).id,
      user_id: (updatedMember as any).user_id,
      role: (updatedMember as any).role,
      added_by: (updatedMember as any).added_by,
      added_at: (updatedMember as any).added_at,
      user: {
        email: (updatedMember as any).users?.email,
        name: (updatedMember as any).users?.raw_user_meta_data?.full_name || (updatedMember as any).users?.raw_user_meta_data?.name,
        avatar_url: (updatedMember as any).users?.raw_user_meta_data?.avatar_url,
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Team member role updated successfully',
      data: transformedMember,
    })
  } catch (error: any) {
    console.error('Update team member role API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/projects/[id]/team/[userId] - Remove team member from project
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    let currentUserId = request.headers.get('x-user-id')

    // For demo purposes, allow real user
    if (!currentUserId || currentUserId === 'demo-user-123') {
      currentUserId = '0c2af3ff-bd5e-4fbe-b8e2-b5b73266b562'
    }

    if (!currentUserId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const projectId = params.id
    const targetUserId = params.userId

    if (!projectId || !targetUserId) {
      return NextResponse.json(
        { success: false, error: 'Project ID and User ID are required' },
        { status: 400 }
      )
    }

    // Prevent users from removing themselves
    if (currentUserId === targetUserId) {
      return NextResponse.json(
        { success: false, error: 'Cannot remove yourself from the project' },
        { status: 403 }
      )
    }

    // Check if the current user has permission to remove team members
    const { data: userRole, error: roleError } = await supabase
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', currentUserId)
      .single()

    if (roleError || !userRole) {
      // Check organization membership if not a direct project member
      const { data: orgData } = await supabase
        .from('projects')
        .select('organization_id')
        .eq('id', projectId)
        .single()

      if (orgData?.organization_id) {
        const { data: orgRole } = await supabase
          .from('organization_members')
          .select('role')
          .eq('organization_id', orgData.organization_id)
          .eq('user_id', currentUserId)
          .single()

        if (!orgRole || !['owner', 'admin'].includes(orgRole.role)) {
          return NextResponse.json(
            { success: false, error: 'You do not have permission to remove team members' },
            { status: 403 }
          )
        }
      } else {
        return NextResponse.json(
          { success: false, error: 'You do not have permission to remove team members' },
          { status: 403 }
        )
      }
    } else if (!['owner', 'admin'].includes(userRole.role)) {
      return NextResponse.json(
        { success: false, error: 'You do not have permission to remove team members' },
        { status: 403 }
      )
    }

    // Verify the target user is a team member of this project
    const { data: targetMember, error: memberError } = await supabase
      .from('project_members')
      .select('id, role')
      .eq('project_id', projectId)
      .eq('user_id', targetUserId)
      .single()

    if (memberError || !targetMember) {
      return NextResponse.json(
        { success: false, error: 'User is not a member of this project' },
        { status: 404 }
      )
    }

    // Prevent removing the last owner/admin
    if (targetMember.role === 'owner' || targetMember.role === 'admin') {
      const { count: adminCount } = await supabase
        .from('project_members')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId)
        .in('role', ['owner', 'admin'])

      if (adminCount && adminCount <= 1) {
        return NextResponse.json(
          { success: false, error: 'Cannot remove the last admin/owner from the project' },
          { status: 400 }
        )
      }
    }

    // Remove the team member
    const { error: deleteError } = await supabase
      .from('project_members')
      .delete()
      .eq('project_id', projectId)
      .eq('user_id', targetUserId)

    if (deleteError) {
      console.error('Error removing team member:', deleteError)
      return NextResponse.json(
        { success: false, error: 'Failed to remove team member' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Team member removed successfully',
    })
  } catch (error: any) {
    console.error('Remove team member API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

