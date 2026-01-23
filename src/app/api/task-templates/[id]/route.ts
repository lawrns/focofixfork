import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'

export const dynamic = 'force-dynamic'

/**
 * DELETE /api/task-templates/:id
 * Deletes a task template by ID
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let authResponse: NextResponse | undefined;
  try {
    const { user, supabase, error, response } = await getAuthUser(req)
    authResponse = response;

    if (error || !user) {
      return mergeAuthResponse(NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }), authResponse)
    }

    const { id } = await params

    // Verify the template belongs to the user
    const { data: template, error: fetchError } = (await supabase
      .from('task_templates')
      .select('user_id')
      .eq('id', id)
      .single()) as { data: any; error: any }

    if (fetchError || !template) {
      return mergeAuthResponse(NextResponse.json({ success: false, error: 'Template not found' }, { status: 404 }), authResponse)
    }

    if (template.user_id !== user.id) {
      return mergeAuthResponse(NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 }), authResponse)
    }

    // Delete the template
    const { error: deleteError } = (await supabase.from('task_templates').delete().eq('id', id)) as { error: any }

    if (deleteError) {
      return mergeAuthResponse(NextResponse.json({ success: false, error: deleteError.message }, { status: 500 }), authResponse)
    }

    return mergeAuthResponse(NextResponse.json({
      success: true,
      data: {
        message: 'Template deleted successfully'
      }
    }), authResponse)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return mergeAuthResponse(NextResponse.json({ success: false, error: message }, { status: 500 }), authResponse)
  }
}
