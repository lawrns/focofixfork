import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/api/auth-helper'

export const dynamic = 'force-dynamic';
export async function POST(req: NextRequest) {
  try {
    const { user, supabase, error } = await getAuthUser(req)

    if (error || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { operation, project_ids, parameters } = body

    if (!operation || !Array.isArray(project_ids) || project_ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid request: operation and project_ids are required' },
        { status: 400 }
      )
    }

    const successful: string[] = []
    const failed: Array<{ id: string; error: string }> = []

    if (operation === 'archive') {
      // Archive projects by setting archived_at to current timestamp
      const { error: updateError } = await supabase
        .from('foco_projects')
        .update({ archived_at: new Date().toISOString() })
        .in('id', project_ids)

      if (updateError) {
        return NextResponse.json(
          { success: false, error: updateError.message },
          { status: 500 }
        )
      }

      // All projects were successfully archived
      successful.push(...project_ids)
    } else if (operation === 'unarchive') {
      // Unarchive projects by setting archived_at to null
      const { error: updateError } = await supabase
        .from('foco_projects')
        .update({ archived_at: null })
        .in('id', project_ids)

      if (updateError) {
        return NextResponse.json(
          { success: false, error: updateError.message },
          { status: 500 }
        )
      }

      // All projects were successfully unarchived
      successful.push(...project_ids)
    } else if (operation === 'delete') {
      // Delete projects
      const { error: deleteError } = await supabase
        .from('foco_projects')
        .delete()
        .in('id', project_ids)

      if (deleteError) {
        return NextResponse.json(
          { success: false, error: deleteError.message },
          { status: 500 }
        )
      }

      // All projects were successfully deleted
      successful.push(...project_ids)
    } else {
      return NextResponse.json(
        { success: false, error: `Unknown operation: ${operation}` },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        successful,
        failed
      }
    })
  } catch (err: any) {
    console.error('Bulk operations error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
