import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// TODO: Move to centralized auth utility
async function getAuthUser(req: NextRequest) {
  const cookieStore = await cookies()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        cookie: cookieStore.toString()
      }
    }
  })
  
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return { user: null, supabase, error: 'Unauthorized' }
  }
  
  return { user, supabase, error: null }
}

export async function GET(req: NextRequest) {
  try {
    const { user, supabase, error } = await getAuthUser(req)
    
    if (error || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const organizationId = searchParams.get('organization_id')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabase
      .from('projects')
      .select('*')
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error: queryError } = await query

    if (queryError) {
      console.error('Projects fetch error:', queryError)
      return NextResponse.json({ success: false, error: queryError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: {
        data: data || [],
        pagination: { limit, offset, total: data?.length || 0 }
      }
    })
  } catch (err: any) {
    console.error('Projects API error:', err)
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
    
    // Validate required fields
    if (!body.name) {
      return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 })
    }

    // Generate slug from name if not provided
    const slug = body.slug || body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

    const projectData = {
      name: body.name,
      slug,
      description: body.description || null,
      color: body.color || '#6366F1',
      icon: body.icon || 'folder',
      status: body.status || 'active',
      organization_id: body.organization_id,
      created_by: user.id,
    }

    const { data, error: insertError } = await supabase
      .from('projects')
      .insert(projectData)
      .select()
      .single()

    if (insertError) {
      console.error('Project create error:', insertError)
      return NextResponse.json({ success: false, error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (err: any) {
    console.error('Projects POST error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
