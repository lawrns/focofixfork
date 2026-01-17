import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'

export const dynamic = 'force-dynamic'

/**
 * DELETE /api/custom-fields/[id]
 * Delete a custom field (cascades to delete all associated values)
 */
export async function DELETE(
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

    const { id: fieldId } = params

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
      return mergeAuthResponse(NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      ), authResponse)
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

    return mergeAuthResponse(NextResponse.json({
      success: true,
      message: 'Custom field deleted successfully',
    }), authResponse)
  } catch (err: any) {
    console.error('Custom field DELETE error:', err)
    return mergeAuthResponse(NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    ), authResponse)
  }
}
