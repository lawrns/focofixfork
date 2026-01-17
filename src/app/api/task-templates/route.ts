import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'

export const dynamic = 'force-dynamic'

/**
 * GET /api/task-templates
 * Lists all task templates for the authenticated user
 * Query parameters:
 *   - limit: number of results (default: 50)
 *   - offset: pagination offset (default: 0)
 */
export async function GET(req: NextRequest) {
  let authResponse: NextResponse | undefined;
  try {
    const { user, supabase, error, response } = await getAuthUser(req)
    authResponse = response;

    if (error || !user) {
      return mergeAuthResponse(NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }), authResponse)
    }

    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const { data, error: queryError, count } = await supabase
      .from('task_templates')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (queryError) {
      console.error('Task templates fetch error:', queryError)
      return mergeAuthResponse(NextResponse.json({ success: false, error: queryError.message }, { status: 500 }), authResponse)
    }

    return mergeAuthResponse(NextResponse.json({
      success: true,
      data: {
        templates: data || [],
        pagination: {
          limit,
          offset,
          total: count || 0
        }
      }
    }), authResponse)
  } catch (err: any) {
    console.error('Task templates GET error:', err)
    return mergeAuthResponse(NextResponse.json({ success: false, error: err.message }, { status: 500 }), authResponse)
  }
}

/**
 * POST /api/task-templates
 * Creates a new task template
 * Request body:
 *   - name: string (required) - template name
 *   - title_template: string (required) - template for task title
 *   - description_template: string (optional) - template for task description
 *   - tags: string[] (optional) - tags to apply to tasks created from this template
 *   - priority: string (optional) - priority level (low, medium, high, urgent)
 */
export async function POST(req: NextRequest) {
  let authResponse: NextResponse | undefined;
  try {
    const { user, supabase, error, response } = await getAuthUser(req)
    authResponse = response;

    if (error || !user) {
      return mergeAuthResponse(NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }), authResponse)
    }

    const body = await req.json()

    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { success: false, error: 'Template name is required' },
        { status: 400 }
      )
    }

    if (!body.title_template) {
      return NextResponse.json(
        { success: false, error: 'Title template is required' },
        { status: 400 }
      )
    }

    // Validate priority if provided
    const validPriorities = ['low', 'medium', 'high', 'urgent']
    if (body.priority && !validPriorities.includes(body.priority)) {
      return NextResponse.json(
        { success: false, error: 'Invalid priority value' },
        { status: 400 }
      )
    }

    const templateData = {
      user_id: user.id,
      name: body.name,
      title_template: body.title_template,
      description_template: body.description_template || null,
      tags: body.tags || null,
      priority: body.priority || 'medium'
    }

    const { data, error: insertError } = await supabase
      .from('task_templates')
      .insert(templateData)
      .select()
      .single()

    if (insertError) {
      console.error('Task template create error:', insertError)
      return mergeAuthResponse(NextResponse.json({ success: false, error: insertError.message }, { status: 500 }), authResponse)
    }

    return mergeAuthResponse(NextResponse.json({ success: true, data }, { status: 201 }), authResponse)
  } catch (err: any) {
    console.error('Task templates POST error:', err)
    return mergeAuthResponse(NextResponse.json({ success: false, error: err.message }, { status: 500 }), authResponse)
  }
}
