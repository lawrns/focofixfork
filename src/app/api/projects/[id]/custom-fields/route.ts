import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/api/auth-helper'

/**
 * GET /api/projects/[id]/custom-fields
 * List all custom fields for a project
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, supabase, error } = await getAuthUser(req)

    if (error || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id: projectId } = await params

    // Verify user has access to project
    const { data: project, error: projectError } = await supabase
      .from('foco_projects')
      .select('id, workspace_id')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      )
    }

    // Fetch custom fields
    const { data: fields, error: fieldsError } = await supabase
      .from('custom_fields')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })

    if (fieldsError) {
      console.error('Custom fields fetch error:', fieldsError)
      return NextResponse.json(
        { success: false, error: fieldsError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: fields || [],
    })
  } catch (err: any) {
    console.error('Custom fields GET error:', err)
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/projects/[id]/custom-fields
 * Create a new custom field for a project
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, supabase, error } = await getAuthUser(req)

    if (error || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id: projectId } = await params
    const body = await req.json()

    // Validate required fields
    if (!body.field_name || !body.field_type) {
      return NextResponse.json(
        { success: false, error: 'field_name and field_type are required' },
        { status: 400 }
      )
    }

    // Validate field_type
    const validTypes = ['text', 'number', 'date', 'dropdown']
    if (!validTypes.includes(body.field_type)) {
      return NextResponse.json(
        {
          success: false,
          error: 'field_type must be one of: text, number, date, dropdown',
        },
        { status: 400 }
      )
    }

    // Verify user has access to project
    const { data: project, error: projectError } = await supabase
      .from('foco_projects')
      .select('id, workspace_id')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      )
    }

    // Validate dropdown options
    if (body.field_type === 'dropdown' && (!body.options || !Array.isArray(body.options))) {
      return NextResponse.json(
        { success: false, error: 'options array is required for dropdown fields' },
        { status: 400 }
      )
    }

    // Create custom field
    const { data: field, error: createError } = await supabase
      .from('custom_fields')
      .insert([
        {
          project_id: projectId,
          field_name: body.field_name,
          field_type: body.field_type,
          options: body.options || null,
        },
      ])
      .select()
      .single()

    if (createError) {
      console.error('Custom field creation error:', createError)
      // Handle unique constraint violation
      if (createError.code === '23505') {
        return NextResponse.json(
          { success: false, error: 'A field with this name already exists in the project' },
          { status: 409 }
        )
      }
      return NextResponse.json(
        { success: false, error: createError.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        data: field,
      },
      { status: 201 }
    )
  } catch (err: any) {
    console.error('Custom field POST error:', err)
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    )
  }
}
