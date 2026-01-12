import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/api/auth-helper'

export async function GET(req: NextRequest) {
  try {
    const { user, supabase, error } = await getAuthUser(req)
    
    if (error || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's workspaces (organizations)
    const { data: workspaces, error: queryError } = await supabase
      .from('workspace_members')
      .select(`
        workspace_id,
        role,
        workspaces!inner (
          id,
          name,
          slug,
          description,
          logo_url,
          created_at,
          updated_at
        )
      `)
      .eq('user_id', user.id)

    if (queryError) {
      console.error('Organizations fetch error:', queryError)
      return NextResponse.json({ success: false, error: queryError.message }, { status: 500 })
    }

    // Transform data to match expected format
    const organizations = workspaces?.map((wm: any) => ({
      id: wm.workspaces?.id || wm.workspace_id,
      name: wm.workspaces?.name,
      slug: wm.workspaces?.slug,
      description: wm.workspaces?.description,
      logo_url: wm.workspaces?.logo_url,
      role: wm.role,
      created_at: wm.workspaces?.created_at,
      updated_at: wm.workspaces?.updated_at
    })) || []

    return NextResponse.json({
      success: true,
      data: organizations
    })
  } catch (err: any) {
    console.error('Organizations API error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, supabase, error } = await getAuthUser(req)
    
    if (error || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    
    if (!body.name) {
      return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 })
    }

    // Generate slug
    const slug = body.slug || body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

    // Create workspace
    const { data: workspace, error: createError } = await supabase
      .from('workspaces')
      .insert({
        name: body.name,
        slug,
        description: body.description || null,
        logo_url: body.logo_url || null
      })
      .select()
      .single()

    if (createError) {
      console.error('Organization create error:', createError)
      return NextResponse.json({ success: false, error: createError.message }, { status: 500 })
    }

    // Add creator as admin
    const { error: memberError } = await supabase
      .from('workspace_members')
      .insert({
        workspace_id: workspace.id,
        user_id: user.id,
        role: 'admin'
      })

    if (memberError) {
      console.error('Member add error:', memberError)
    }

    return NextResponse.json({ success: true, data: workspace }, { status: 201 })
  } catch (err: any) {
    console.error('Organizations POST error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
