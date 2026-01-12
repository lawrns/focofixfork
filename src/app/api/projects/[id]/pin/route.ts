import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const projectId = params.id

    // Verify user has access to this project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('organization_id')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      )
    }

    // Verify user is member of the organization
    const { data: orgMember, error: memberError } = await supabase
      .from('organization_members')
      .select('id')
      .eq('organization_id', project.organization_id)
      .eq('user_id', user.id)
      .single()

    if (memberError || !orgMember) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      )
    }

    // Insert pin record
    const { data, error } = await supabase
      .from('user_project_pins')
      .insert({
        user_id: user.id,
        project_id: projectId,
      })
      .select()
      .single()

    if (error) {
      // If it's a unique constraint error, the project is already pinned
      if (error.code === '23505') {
        return NextResponse.json(
          {
            success: true,
            data: {
              id: projectId,
              is_pinned: true,
            },
          },
          { status: 200 }
        )
      }

      throw error
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          id: projectId,
          is_pinned: true,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error pinning project:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to pin project' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const projectId = params.id

    // Verify user has access to this project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('organization_id')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      )
    }

    // Verify user is member of the organization
    const { data: orgMember, error: memberError } = await supabase
      .from('organization_members')
      .select('id')
      .eq('organization_id', project.organization_id)
      .eq('user_id', user.id)
      .single()

    if (memberError || !orgMember) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      )
    }

    // Delete pin record
    const { error } = await supabase
      .from('user_project_pins')
      .delete()
      .eq('user_id', user.id)
      .eq('project_id', projectId)

    if (error) {
      throw error
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          id: projectId,
          is_pinned: false,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error unpinning project:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to unpin project' },
      { status: 500 }
    )
  }
}
