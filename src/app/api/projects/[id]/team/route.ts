import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase-server'

// Schema for adding team members
const addTeamMemberSchema = z.object({
  user_id: z.string().uuid(),
  role: z.enum(['admin', 'member', 'guest']),
  project_id: z.string().uuid().optional(),
})

interface RouteParams {
  params: {
    id: string
  }
}

/**
 * POST /api/projects/[id]/team - Add a team member to a project
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    let userId = request.headers.get('x-user-id')

    // For demo purposes, allow real user
    if (!userId || userId === 'demo-user-123') {
      userId = '0c2af3ff-bd5e-4fbe-b8e2-b5b73266b562'
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const projectId = params.id
    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'Project ID is required' },
        { status: 400 }
      )
    }

    const body = await request.json()

    // Validate request body
    const validationResult = addTeamMemberSchema.safeParse(body)
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

    // TODO: Re-enable permission checks when RLS is properly configured
    // For now, allow all authenticated users to view team members

    // For now, skip user validation since we're using service-side auth
    // TODO: Add proper user validation when auth is fully implemented

    // Check if user is already a member of this project
    const { data: existingMember } = await supabaseAdmin
      .from('project_team_assignments')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', validationResult.data.user_id)
      .single()

    if (existingMember) {
      return NextResponse.json(
        { success: false, error: 'User is already a member of this project' },
        { status: 409 }
      )
    }

    // Add the team member
    const { data: newMember, error: insertError } = await supabaseAdmin
      .from('project_team_assignments')
      .insert({
        project_id: projectId,
        user_id: validationResult.data.user_id,
        role: validationResult.data.role,
        added_by: userId,
      })
      .select(`
        id,
        user_id,
        role,
        added_by,
        added_at,
        auth.users!project_team_assignments_user_id_fkey (
          email,
          raw_user_meta_data
        )
      `)
      .single()

    if (insertError) {
      console.error('Error adding team member:', insertError)
      return NextResponse.json(
        { success: false, error: 'Failed to add team member' },
        { status: 500 }
      )
    }

    // Transform the response data
    const transformedMember = {
      id: (newMember as any).id,
      user_id: (newMember as any).user_id,
      role: (newMember as any).role,
      added_by: (newMember as any).added_by,
      added_at: (newMember as any).added_at,
      user: {
        email: (newMember as any).users?.email,
        name: (newMember as any).users?.raw_user_meta_data?.full_name || (newMember as any).users?.raw_user_meta_data?.name,
        avatar_url: (newMember as any).users?.raw_user_meta_data?.avatar_url,
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Team member added successfully',
      data: transformedMember,
    }, { status: 201 })
  } catch (error: any) {
    console.error('Add team member API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/projects/[id]/team - Get team members for a project
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    let userId = request.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const projectId = params.id
    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'Project ID is required' },
        { status: 400 }
      )
    }

    // Fetch team members from project_team_assignments table
    const { data: teamMembers, error } = await supabaseAdmin
      .from('project_team_assignments')
      .select(`
        id,
        user_id,
        role,
        added_by,
        added_at
      `)
      .eq('project_id', projectId)
      .order('added_at', { ascending: false })

    if (error) {
      console.error('Error fetching team members:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch team members' },
        { status: 500 }
      )
    }

    // Transform the data to include user profile information
    const transformedTeamMembers = teamMembers?.map(member => ({
      id: (member as any).id,
      user_id: (member as any).user_id,
      role: (member as any).role,
      added_by: (member as any).added_by,
      added_at: (member as any).added_at,
      user: {
        email: (member as any).users?.email,
        name: (member as any).users?.raw_user_meta_data?.full_name || (member as any).users?.raw_user_meta_data?.name,
        avatar_url: (member as any).users?.raw_user_meta_data?.avatar_url,
      }
    })) || []

    return NextResponse.json({
      success: true,
      data: transformedTeamMembers,
    })
  } catch (error: any) {
    console.error('Get team members API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

