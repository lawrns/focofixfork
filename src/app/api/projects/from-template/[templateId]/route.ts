import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/api/auth-helper'
import { ProjectTemplateModel } from '@/lib/models/project-templates'
import { ProjectModel } from '@/lib/models/projects'

/**
 * POST /api/projects/from-template/[templateId]
 * Create a new project from a template
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { templateId: string } }
) {
  try {
    const { user, supabase, error } = await getAuthUser(req)

    if (error || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
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
    const { data: templateData, error: templateError } = await supabase
      .from('project_templates')
      .select('*')
      .eq('id', params.templateId)
      .single()

    if (templateError || !templateData) {
      console.error('Template fetch error:', templateError)
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      )
    }

    // Check access: user owns it or it's public
    const canAccess = templateData.user_id === user.id || templateData.is_public

    if (!canAccess) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      )
    }

    const template = ProjectTemplateModel.fromDatabase(templateData)

    // Create new project
    const { data: projectData, error: projectError } = await supabase
      .from('foco_projects')
      .insert({
        name: body.project_name,
        description: body.description || template.description || null,
        workspace_id: body.workspace_id,
        created_by: user.id,
        status: 'planning',
        progress: 0,
      })
      .select()

    if (projectError) {
      console.error('Project creation error:', projectError)
      return NextResponse.json(
        { success: false, error: 'Failed to create project', details: projectError.message },
        { status: 500 }
      )
    }

    const newProject = projectData?.[0]

    if (!newProject) {
      return NextResponse.json(
        { success: false, error: 'Failed to create project' },
        { status: 500 }
      )
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
        created_by: user.id,
        position: index,
      }))

      const { data: insertedTasks, error: tasksError } = await supabase
        .from('foco_tasks')
        .insert(tasksToInsert)
        .select()

      if (tasksError) {
        console.warn('Failed to create default tasks:', tasksError)
        // Don't fail the entire operation if tasks creation fails
      } else if (insertedTasks) {
        createdTasks.push(...insertedTasks)
      }
    }

    // Increment template usage count
    await supabase
      .from('project_templates')
      .update({ usage_count: (template.usage_count || 0) + 1 })
      .eq('id', params.templateId)
      .catch(err => console.warn('Failed to update usage count:', err))

    return NextResponse.json(
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
    )
  } catch (err: any) {
    console.error('Create from template API error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
