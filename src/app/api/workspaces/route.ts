import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * GET /api/workspaces
 * Fetches all workspaces for the authenticated user
 *
 * Returns:
 * {
 *   workspaces: Array<{
 *     id: string
 *     name: string
 *     slug: string
 *     icon?: string
 *   }>
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Get auth token from cookies
    const token = request.cookies.get('sb-token')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized', workspaces: [] },
        { status: 401 }
      )
    }

    // Initialize Supabase client
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

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Failed to get user', workspaces: [] },
        { status: 401 }
      )
    }

    // Fetch user's organizations/workspaces
    const { data: organizations, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, slug, logo_url')
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (orgError) {
      console.error('Error fetching organizations:', orgError)
      return NextResponse.json(
        { error: 'Failed to fetch workspaces', workspaces: [] },
        { status: 500 }
      )
    }

    // Map organizations to workspace format
    const workspaces = (organizations || []).map(org => ({
      id: org.id,
      name: org.name,
      slug: org.slug,
      icon: org.logo_url ? undefined : '📦', // Default icon if no logo
    }))

    return NextResponse.json({
      workspaces,
      total: workspaces.length,
    })
  } catch (error) {
    console.error('Workspace fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error', workspaces: [] },
      { status: 500 }
    )
  }
}

/**
 * POST /api/workspaces
 * Creates a new workspace for the authenticated user
 *
 * Request body:
 * {
 *   name: string
 *   slug: string
 *   icon?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('sb-token')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name, slug, icon } = body

    if (!name || !slug) {
      return NextResponse.json(
        { error: 'Missing required fields: name, slug' },
        { status: 400 }
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

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Failed to get user' },
        { status: 401 }
      )
    }

    // Create new organization/workspace
    const { data: newOrg, error: createError } = await supabase
      .from('organizations')
      .insert([
        {
          name,
          slug,
          created_by: user.id,
          is_active: true,
        },
      ])
      .select()
      .single()

    if (createError) {
      console.error('Error creating organization:', createError)
      return NextResponse.json(
        { error: 'Failed to create workspace' },
        { status: 500 }
      )
    }

    // Add creator as organization member
    const { error: memberError } = await supabase
      .from('organization_members')
      .insert([
        {
          organization_id: newOrg.id,
          user_id: user.id,
          role: 'owner',
        },
      ])

    if (memberError) {
      console.error('Error adding organization member:', memberError)
      // Clean up created organization
      await supabase
        .from('organizations')
        .delete()
        .eq('id', newOrg.id)

      return NextResponse.json(
        { error: 'Failed to set up workspace' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        workspace: {
          id: newOrg.id,
          name: newOrg.name,
          slug: newOrg.slug,
          icon,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Workspace creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
