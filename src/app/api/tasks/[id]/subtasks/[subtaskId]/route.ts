import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/api/auth-helper'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; subtaskId: string }> }
) {
  try {
    const { user, supabase, error } = await getAuthUser(req)

    if (error || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id, subtaskId } = await params
    const body = await req.json()

    // Build update object with only provided fields
    const updateData: Record<string, any> = {}

    if (body.title !== undefined) {
      if (typeof body.title !== 'string') {
        return NextResponse.json(
          { success: false, error: 'Title must be a string' },
          { status: 400 }
        )
      }
      if (body.title.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: 'Title cannot be empty' },
          { status: 400 }
        )
      }
      if (body.title.length > 500) {
        return NextResponse.json(
          { success: false, error: 'Title must be 500 characters or less' },
          { status: 400 }
        )
      }
      updateData.title = body.title.trim()
    }

    if (body.completed !== undefined) {
      if (typeof body.completed !== 'boolean') {
        return NextResponse.json(
          { success: false, error: 'Completed must be a boolean' },
          { status: 400 }
        )
      }
      updateData.completed = body.completed
    }

    if (body.position !== undefined) {
      if (typeof body.position !== 'string') {
        return NextResponse.json(
          { success: false, error: 'Position must be a string' },
          { status: 400 }
        )
      }
      updateData.position = body.position
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      )
    }

    // Update subtask
    const { data, error: updateError } = await supabase
      .from('task_subtasks')
      .update(updateData)
      .eq('id', subtaskId)
      .eq('task_id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Update subtask error:', updateError)
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json(
        { success: false, error: 'Subtask not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error('PATCH subtask error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; subtaskId: string }> }
) {
  try {
    const { user, supabase, error } = await getAuthUser(req)

    if (error || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id, subtaskId } = await params

    // Delete subtask
    const { error: deleteError } = await supabase
      .from('task_subtasks')
      .delete()
      .eq('id', subtaskId)
      .eq('task_id', id)

    if (deleteError) {
      console.error('Delete subtask error:', deleteError)
      return NextResponse.json({ success: false, error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Subtask deleted' })
  } catch (err: any) {
    console.error('DELETE subtask error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
