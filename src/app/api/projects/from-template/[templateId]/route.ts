import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'

import { ProjectTemplateModel } from '@/lib/models/project-templates'
import { ProjectModel } from '@/lib/models/projects'

export const dynamic = 'force-dynamic'

/**
 * POST /api/projects/from-template/[templateId]
 * Create a new project from a template
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const { user, supabase, error, response: authResponse } = await getAuthUser(req)

    if (error || !user) {
      return mergeAuthResponse(NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }), authResponse)
    }

    const body = await req.json()

    // Validate input
    if (!body.project_name || body.project_name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Project name is required' },
        { status: 400 }
      )
    }

    if (!body.workspace_id) {
      return NextResponse.json(
        { success: false, error: 'Workspace ID is required' },
        { status: 400 }
      )
    }

    // Fetch the template
    const { templateId } = await params
    const { data: templateData, error: templateError } = await supabase
      .from('project_templates')
      .select('*')
      .eq('id', templateId)
      .single()

    if (templateError || !templateData) {
      return mergeAuthResponse(NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      ), authResponse)
    }

    // Check access: user owns it or it's public
    const canAccess = templateData.user_id === user.id || templateData.is_public

    if (!canAccess) {
      return mergeAuthResponse(NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      ), authResponse)
    }

    const template = ProjectTemplateModel.fromDatabase(templateData)

    // Create new project
    const { data: projectData, error: projectError } = await supabase
      .from('foco_projects')
      .insert({
        name: body.project_name,
        description: body.description || template.description || null,
        workspace_id: body.workspace_id,
        owner_id: user.id,
        status: 'active',
      })
      .select()

    if (projectError) {
      return mergeAuthResponse(NextResponse.json(
        { success: false, error: 'Failed to create project', details: projectError.message },
        { status: 500 }
      ), authResponse)
    }

    const newProject = projectData?.[0]

    if (!newProject) {
      return mergeAuthResponse(NextResponse.json(
        { success: false, error: 'Failed to create project' },
        { status: 500 }
      ), authResponse)
    }

    // Create default tasks from template
    const createdTasks = []
    if (template.structure.defaultTasks && template.structure.defaultTasks.length > 0) {
      const tasksToInsert = template.structure.defaultTasks.map((task, index) => ({
        title: task.title,
        description: task.description || null,
        project_id: newProject.id,
        priority: task.priority,
        status: 'todo',
        reporter_id: user.id,
        position: index.toString(),
      }))

      const { data: insertedTasks, error: tasksError } = await supabase
        .from('work_items')
        .insert(tasksToInsert)
        .select()

      if (tasksError) {
        // Don't fail the entire operation if tasks creation fails
      } else if (insertedTasks) {
        createdTasks.push(...insertedTasks)
      }
    }

    // Increment template usage count
    const { error: usageError } = await supabase
      .from('project_templates')
      .update({ usage_count: (template.usage_count || 0) + 1 })
      .eq('id', templateId)

    if (usageError) {
      // Non-critical error, continue
    }

    return mergeAuthResponse(NextResponse.json(
      {
        success: true,
        data: {
          project: newProject,
          defaultTasksCreated: createdTasks.length,
          customFieldsAvailable: template.structure.customFields.length,
        },
        message: `Project created from template with ${createdTasks.length} default tasks`,
      },
      { status: 201 }
    ), authResponse)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
