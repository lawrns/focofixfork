import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/api/auth-helper'

export const dynamic = 'force-dynamic';import { ProjectTemplateModel, UpdateTemplateData } from '@/lib/models/project-templates'

/**
 * GET /api/project-templates/[id]
 * Get a specific template
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, supabase, error } = await getAuthUser(req)

    if (error || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error: queryError } = await supabase
      .from('project_templates')
      .select('*')
      .eq('id', params.id)
      .single()

    if (queryError) {
      console.error('Template fetch error:', queryError)
      return NextResponse.json({ success: false, error: 'Template not found' }, { status: 404 })
    }

    if (!data) {
      return NextResponse.json({ success: false, error: 'Template not found' }, { status: 404 })
    }

    // Check access: user owns it or it's public
    const canAccess = data.user_id === user.id || data.is_public

    if (!canAccess) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      )
    }

    const template = ProjectTemplateModel.fromDatabase(data)

    return NextResponse.json({
      success: true,
      data: template,
    })
  } catch (err: any) {
    console.error('Template fetch API error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

/**
 * PUT /api/project-templates/[id]
 * Update a template
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, supabase, error } = await getAuthUser(req)

    if (error || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()

    // Verify ownership
    const { data: template, error: fetchError } = await supabase
      .from('project_templates')
      .select('user_id')
      .eq('id', params.id)
      .single()

    if (fetchError || !template) {
      return NextResponse.json({ success: false, error: 'Template not found' }, { status: 404 })
    }

    if (template.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      )
    }

    // Validate update data
    const updateData: UpdateTemplateData = {
      name: body.name,
      description: body.description,
      structure: body.structure,
      is_public: body.is_public,
      tags: body.tags,
    }

    const validation = ProjectTemplateModel.validateUpdate(updateData)
    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', errors: validation.errors },
        { status: 400 }
      )
    }

    // Update template
    const { data: updated, error: updateError } = await supabase
      .from('project_templates')
      .update({
        name: updateData.name,
        description: updateData.description,
        structure: updateData.structure,
        is_public: updateData.is_public,
        tags: updateData.tags,
      })
      .eq('id', params.id)
      .select()

    if (updateError) {
      console.error('Template update error:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to update template', details: updateError.message },
        { status: 500 }
      )
    }

    const updatedTemplate = updated?.[0] ? ProjectTemplateModel.fromDatabase(updated[0]) : null

    return NextResponse.json({
      success: true,
      data: updatedTemplate,
      message: 'Template updated successfully',
    })
  } catch (err: any) {
    console.error('Template update API error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

/**
 * DELETE /api/project-templates/[id]
 * Delete a template
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, supabase, error } = await getAuthUser(req)

    if (error || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Verify ownership
    const { data: template, error: fetchError } = await supabase
      .from('project_templates')
      .select('user_id')
      .eq('id', params.id)
      .single()

    if (fetchError || !template) {
      return NextResponse.json({ success: false, error: 'Template not found' }, { status: 404 })
    }

    if (template.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      )
    }

    // Delete template
    const { error: deleteError } = await supabase
      .from('project_templates')
      .delete()
      .eq('id', params.id)

    if (deleteError) {
      console.error('Template deletion error:', deleteError)
      return NextResponse.json(
        { success: false, error: 'Failed to delete template', details: deleteError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Template deleted successfully',
    })
  } catch (err: any) {
    console.error('Template deletion API error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
