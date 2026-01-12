import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/api/auth-helper'
import { generateFractionalIndex } from '@/lib/utils/fractional-indexing'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, supabase, error } = await getAuthUser(req)

    if (error || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Get all subtasks for the task, ordered by position
    const { data, error: queryError } = await supabase
      .from('task_subtasks')
      .select('*')
      .eq('task_id', id)
      .order('position', { ascending: true })

    if (queryError) {
      console.error('Subtasks fetch error:', queryError)
      return NextResponse.json({ success: false, error: queryError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: data || [],
    })
  } catch (err: any) {
    console.error('Get subtasks error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, supabase, error } = await getAuthUser(req)

    if (error || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const { title } = body

    // Validation
    if (!title || typeof title !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Title is required and must be a string' },
        { status: 400 }
      )
    }

    if (title.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Title cannot be empty' },
        { status: 400 }
      )
    }

    if (title.length > 500) {
      return NextResponse.json(
        { success: false, error: 'Title must be 500 characters or less' },
        { status: 400 }
      )
    }

    // Get the last subtask to determine position
    const { data: lastSubtask } = await supabase
      .from('task_subtasks')
      .select('position')
      .eq('task_id', id)
      .order('position', { ascending: false })
      .limit(1)
      .single()

    const lastPosition = lastSubtask?.position || 'a0'
    const newPosition = generateFractionalIndex(lastPosition, null)

    // Create new subtask
    const { data, error: createError } = await supabase
      .from('task_subtasks')
      .insert({
        task_id: id,
        title: title.trim(),
        completed: false,
        position: newPosition,
      })
      .select()
      .single()

    if (createError) {
      console.error('Create subtask error:', createError)
      return NextResponse.json({ success: false, error: createError.message }, { status: 500 })
    }

    return NextResponse.json(
      { success: true, data },
      { status: 201 }
    )
  } catch (err: any) {
    console.error('Create subtask error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
