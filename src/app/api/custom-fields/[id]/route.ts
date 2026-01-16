import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/api/auth-helper'

export const dynamic = 'force-dynamic';
/**
 * DELETE /api/custom-fields/[id]
 * Delete a custom field (cascades to delete all associated values)
 */
export async function DELETE(
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

    const { id: fieldId } = await params

    // Verify field exists
    const { data: field, error: fieldError } = await supabase
      .from('custom_fields')
      .select('id, project_id')
      .eq('id', fieldId)
      .single()

    if (fieldError || !field) {
      return NextResponse.json(
        { success: false, error: 'Custom field not found' },
        { status: 404 }
      )
    }

    // Verify user has access to the project
    const { data: project, error: projectError } = await supabase
      .from('foco_projects')
      .select('id, workspace_id')
      .eq('id', field.project_id)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      )
    }

    // Delete the custom field (cascade will delete all associated values)
    const { error: deleteError } = await supabase
      .from('custom_fields')
      .delete()
      .eq('id', fieldId)

    if (deleteError) {
      console.error('Custom field deletion error:', deleteError)
      return NextResponse.json(
        { success: false, error: deleteError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Custom field deleted successfully',
    })
  } catch (err: any) {
    console.error('Custom field DELETE error:', err)
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    )
  }
}
