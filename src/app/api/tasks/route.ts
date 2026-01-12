import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/api/auth-helper'

export async function GET(req: NextRequest) {
  try {
    const { user, supabase, error } = await getAuthUser(req)
    
    if (error || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('project_id')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabase
      .from('work_items')
      .select('*')
      .order('position', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error: queryError } = await query

    if (queryError) {
      console.error('Tasks fetch error:', queryError)
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
    console.error('Tasks API error:', err)
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
    if (!body.title) {
      return NextResponse.json({ success: false, error: 'Title is required' }, { status: 400 })
    }

    if (!body.project_id) {
      return NextResponse.json({ success: false, error: 'Project ID is required' }, { status: 400 })
    }

    // Get workspace_id from project
    const { data: projectData } = await supabase
      .from('foco_projects')
      .select('workspace_id')
      .eq('id', body.project_id)
      .single()

    if (!projectData) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 })
    }

    const taskData = {
      title: body.title,
      description: body.description || null,
      status: body.status || 'backlog',
      priority: body.priority || 'none',
      project_id: body.project_id,
      workspace_id: projectData.workspace_id,
      assignee_id: body.assignee_id || null,
      due_date: body.due_date || null,
      position: body.position || 0,
      reporter_id: user.id,
      type: 'task',
    }

    const { data, error: insertError } = await supabase
      .from('work_items')
      .insert(taskData)
      .select()
      .single()

    if (insertError) {
      console.error('Task create error:', insertError)
      return NextResponse.json({ success: false, error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (err: any) {
    console.error('Tasks POST error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
