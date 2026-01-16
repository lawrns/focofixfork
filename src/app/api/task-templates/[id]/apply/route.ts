import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/api/auth-helper'

export const dynamic = 'force-dynamic';
/**
 * POST /api/task-templates/:id/apply
 * Creates a task from a template
 * Request body:
 *   - project_id: string (required) - project to create task in
 *   - title_override: string (optional) - override template title
 *   - description_override: string (optional) - override template description
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, supabase, error } = await getAuthUser(req)

    if (error || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
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
      return NextResponse.json({ success: false, error: 'Template not found' }, { status: 404 })
    }

    // Get workspace_id from project
    const { data: projectData, error: projectError } = await supabase
      .from('foco_projects')
      .select('workspace_id')
      .eq('id', body.project_id)
      .single()

    if (projectError || !projectData) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 })
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
      console.error('Task create from template error:', taskError)
      return NextResponse.json({ success: false, error: taskError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: task }, { status: 201 })
  } catch (err: any) {
    console.error('Task templates apply error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
