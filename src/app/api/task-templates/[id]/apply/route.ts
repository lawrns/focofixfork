import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'

export const dynamic = 'force-dynamic'

/**
 * POST /api/task-templates/:id/apply
 * Creates a task from a template
 * Request body:
 *   - project_id: string (required) - project to create task in
 *   - title_override: string (optional) - override template title
 *   - description_override: string (optional) - override template description
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  let authResponse: NextResponse | undefined;
  try {
    const { user, supabase, error, response } = await getAuthUser(req)
    authResponse = response;

    if (error || !user) {
      return mergeAuthResponse(NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }), authResponse)
    }

    const body = await req.json()
    const { id } = params

    // Validate project_id
    if (!body.project_id) {
      return NextResponse.json(
        { success: false, error: 'Project ID is required' },
        { status: 400 }
      )
    }

    // Fetch template
    const { data: template, error: templateError } = await supabase
      .from('task_templates')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (templateError || !template) {
      return mergeAuthResponse(NextResponse.json({ success: false, error: 'Template not found' }, { status: 404 }), authResponse)
    }

    // Get workspace_id from project
    const { data: projectData, error: projectError } = await supabase
      .from('foco_projects')
      .select('workspace_id')
      .eq('id', body.project_id)
      .single()

    if (projectError || !projectData) {
      return mergeAuthResponse(NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 }), authResponse)
    }

    // Create task from template
    const taskData = {
      title: body.title_override || template.title_template,
      description: body.description_override || template.description_template || null,
      status: body.status || 'backlog',
      priority: body.priority_override || template.priority || 'medium',
      project_id: body.project_id,
      workspace_id: projectData.workspace_id,
      reporter_id: user.id,
      type: 'task',
      position: 0
    }

    const { data: task, error: taskError } = await supabase
      .from('work_items')
      .insert(taskData)
      .select()
      .single()

    if (taskError) {
      return mergeAuthResponse(NextResponse.json({ success: false, error: taskError.message }, { status: 500 }), authResponse)
    }

    return mergeAuthResponse(NextResponse.json({ success: true, data: task }, { status: 201 }), authResponse)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return mergeAuthResponse(NextResponse.json({ success: false, error: message }, { status: 500 }), authResponse)
  }
}
