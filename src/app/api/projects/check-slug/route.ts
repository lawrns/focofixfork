import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/api/auth-helper'

export async function POST(req: NextRequest) {
  try {
    const { user, supabase, error } = await getAuthUser(req)

    if (error || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()

    // Validate required fields
    if (!body.slug) {
      return NextResponse.json({ success: false, error: 'Slug is required' }, { status: 400 })
    }

    if (!body.workspace_id) {
      return NextResponse.json({ success: false, error: 'Workspace ID is required' }, { status: 400 })
    }

    // Check if slug exists in workspace (excluding current project if updating)
    let query = supabase
      .from('foco_projects')
      .select('id')
      .eq('workspace_id', body.workspace_id)
      .eq('slug', body.slug)
      .limit(1)

    // If checking for an existing project (during edit), exclude it
    if (body.project_id) {
      query = query.neq('id', body.project_id)
    }

    const { data, error: queryError } = await query

    if (queryError) {
      console.error('Slug check error:', queryError)
      return NextResponse.json({ success: false, error: queryError.message }, { status: 500 })
    }

    // If data exists, slug is taken; otherwise it's available
    const available = !data || data.length === 0

    return NextResponse.json({
      success: true,
      available,
      slug: body.slug
    })
  } catch (err: any) {
    console.error('Check slug API error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
