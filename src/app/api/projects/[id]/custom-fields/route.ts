import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'

export const dynamic = 'force-dynamic'

/**
 * GET /api/projects/[id]/custom-fields
 * List all custom fields for a project
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  let authResponse: NextResponse | undefined;
  try {
    const { user, supabase, error, response } = await getAuthUser(req)
    authResponse = response;

    if (error || !user) {
      return mergeAuthResponse(NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      ), authResponse)
    }

    const { id: projectId } = params

    // Verify user has access to project
    const { data: project, error: projectError } = await supabase
      .from('foco_projects')
      .select('id, workspace_id')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return mergeAuthResponse(NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      ), authResponse)
    }

    // Fetch custom fields
    const { data: fields, error: fieldsError } = await supabase
      .from('custom_fields')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })

    if (fieldsError) {
      console.error('Custom fields fetch error:', fieldsError)
      return mergeAuthResponse(NextResponse.json(
        { success: false, error: fieldsError.message },
        { status: 500 }
      ), authResponse)
    }

    return mergeAuthResponse(NextResponse.json({
      success: true,
      data: fields || [],
    }), authResponse)
  } catch (err: any) {
    console.error('Custom fields GET error:', err)
    return mergeAuthResponse(NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    ), authResponse)
  } finally {
    authResponse
  }
}

/**
 * POST /api/projects/[id]/custom-fields
 * Create a new custom field for a project
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  let authResponse: NextResponse | undefined;
  try {
    const { user, supabase, error, response } = await getAuthUser(req)
    authResponse = response;

    if (error || !user) {
      return mergeAuthResponse(NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      ), authResponse)
    }

    const { id: projectId } = params
    const body = await req.json()

    // Validate required fields
    if (!body.field_name || !body.field_type) {
      return mergeAuthResponse(NextResponse.json(
        { success: false, error: 'field_name and field_type are required' },
        { status: 400 }
      ), authResponse)
    }

    // Validate field_type
    const validTypes = ['text', 'number', 'date', 'dropdown']
    if (!validTypes.includes(body.field_type)) {
      return mergeAuthResponse(NextResponse.json(
        {
          success: false,
          error: 'field_type must be one of: text, number, date, dropdown',
        },
        { status: 400 }
      ), authResponse)
    }

    // Verify user has access to project
    const { data: project, error: projectError } = await supabase
      .from('foco_projects')
      .select('id, workspace_id')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return mergeAuthResponse(NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      ), authResponse)
    }

    // Validate dropdown options
    if (body.field_type === 'dropdown' && (!body.options || !Array.isArray(body.options))) {
      return mergeAuthResponse(NextResponse.json(
        { success: false, error: 'options array is required for dropdown fields' },
        { status: 400 }
      ), authResponse)
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
        return mergeAuthResponse(NextResponse.json(
          { success: false, error: 'A field with this name already exists in the project' },
          { status: 409 }
        ), authResponse)
      }
      return mergeAuthResponse(NextResponse.json(
        { success: false, error: createError.message },
        { status: 500 }
      ), authResponse)
    }

    return mergeAuthResponse(NextResponse.json(
      {
        success: true,
        data: field,
      },
      { status: 201 }
    ), authResponse)
  } catch (err: any) {
    console.error('Custom field POST error:', err)
    return mergeAuthResponse(NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    ), authResponse)
  } finally {
    authResponse
  }
}
