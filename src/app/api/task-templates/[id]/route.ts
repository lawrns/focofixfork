import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/api/auth-helper'

export const dynamic = 'force-dynamic';
/**
 * DELETE /api/task-templates/:id
 * Deletes a task template by ID
 */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, supabase, error } = await getAuthUser(req)

    if (error || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params

    // Verify the template belongs to the user
    const { data: template, error: fetchError } = (await supabase
      .from('task_templates')
      .select('user_id')
      .eq('id', id)
      .single()) as { data: any; error: any }

    if (fetchError || !template) {
      return NextResponse.json({ success: false, error: 'Template not found' }, { status: 404 })
    }

    if (template.user_id !== user.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 })
    }

    // Delete the template
    const { error: deleteError } = (await supabase.from('task_templates').delete().eq('id', id)) as { error: any }

    if (deleteError) {
      console.error('Task template delete error:', deleteError)
      return NextResponse.json({ success: false, error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: {
        message: 'Template deleted successfully'
      }
    })
  } catch (err: any) {
    console.error('Task templates DELETE error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
