import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'

import { ProjectTemplateModel, CreateTemplateData, ProjectTemplate } from '@/lib/models/project-templates'

export const dynamic = 'force-dynamic'

/**
 * GET /api/project-templates
 * List templates for user (personal and team)
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
    const workspaceId = searchParams.get('workspace_id')
    const isPublic = searchParams.get('is_public')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabase
      .from('project_templates')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (workspaceId) {
      query = query.eq('workspace_id', workspaceId)
    }

    // Filter by ownership - get user's templates
    let userTemplatesQuery = query.eq('user_id', user.id)

    // Also get public templates from workspace if requested
    let publicQuery = null
    if (isPublic !== 'false') {
      publicQuery = supabase
        .from('project_templates')
        .select('*')
        .eq('is_public', true)
        .eq('workspace_id', workspaceId || '')
        .order('usage_count', { ascending: false })
        .limit(20)
    }

    const [userResult, publicResult] = await Promise.all([
      userTemplatesQuery,
      publicQuery,
    ])

    if (userResult.error) {
      return mergeAuthResponse(NextResponse.json({ success: false, error: userResult.error.message }, { status: 500 }), authResponse)
    }

    const userTemplates = (userResult.data || []).map(ProjectTemplateModel.fromDatabase)
    const publicTemplates = publicResult?.data ? (publicResult.data || []).map(ProjectTemplateModel.fromDatabase) : []

    // Combine and deduplicate
    const allTemplates = [...userTemplates, ...publicTemplates].filter((t, i, arr) =>
      arr.findIndex(x => x.id === t.id) === i
    )

    return mergeAuthResponse(NextResponse.json({
      success: true,
      data: {
        templates: allTemplates,
        pagination: { limit, offset, total: allTemplates.length },
      },
    }), authResponse)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return mergeAuthResponse(NextResponse.json({ success: false, error: message }, { status: 500 }), authResponse)
  }
}

/**
 * POST /api/project-templates
 * Create a new template from project or custom structure
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

    // Validate input
    const templateData: CreateTemplateData = {
      name: body.name,
      description: body.description,
      workspace_id: body.workspace_id,
      structure: body.structure || { defaultTasks: [], customFields: [] },
      is_public: body.is_public || false,
    }

    const validation = ProjectTemplateModel.validateCreate(templateData)
    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', errors: validation.errors },
        { status: 400 }
      )
    }

    // Insert template
    const { data, error: insertError } = await supabase
      .from('project_templates')
      .insert({
        user_id: user.id,
        workspace_id: templateData.workspace_id,
        name: templateData.name,
        description: templateData.description,
        structure: templateData.structure,
        is_public: templateData.is_public,
        owner_id: user.id,
      })
      .select()

    if (insertError) {
      return mergeAuthResponse(NextResponse.json(
        { success: false, error: 'Failed to create template', details: insertError.message },
        { status: 500 }
      ), authResponse)
    }

    const template = data?.[0] ? ProjectTemplateModel.fromDatabase(data[0]) : null

    return mergeAuthResponse(NextResponse.json(
      {
        success: true,
        data: template,
        message: 'Template created successfully',
      },
      { status: 201 }
    ), authResponse)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return mergeAuthResponse(NextResponse.json({ success: false, error: message }, { status: 500 }), authResponse)
  }
}
