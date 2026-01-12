import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/api/auth-helper'

type BatchOperation = 'complete' | 'move' | 'priority' | 'assign' | 'tag' | 'delete'

interface BatchOperationRequest {
  taskIds: string[]
  operation: BatchOperation
  value?: any
}

export async function POST(req: NextRequest) {
  try {
    const { user, supabase, error } = await getAuthUser(req)

    if (error || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body: BatchOperationRequest = await req.json()

    // Validate request
    if (!body.taskIds || !Array.isArray(body.taskIds) || body.taskIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'taskIds must be a non-empty array' },
        { status: 400 }
      )
    }

    if (!body.operation || !['complete', 'move', 'priority', 'assign', 'tag', 'delete'].includes(body.operation)) {
      return NextResponse.json(
        { success: false, error: 'Invalid operation type' },
        { status: 400 }
      )
    }

    let updateData: any = {}
    let isDelete = false

    // Prepare update data based on operation
    switch (body.operation) {
      case 'complete':
        updateData = { status: 'done', updated_at: new Date().toISOString() }
        break
      case 'move':
        if (!body.value) {
          return NextResponse.json(
            { success: false, error: 'value (project_id) is required for move operation' },
            { status: 400 }
          )
        }
        updateData = { project_id: body.value, updated_at: new Date().toISOString() }
        break
      case 'priority':
        if (!body.value || !['low', 'medium', 'high', 'urgent'].includes(body.value)) {
          return NextResponse.json(
            { success: false, error: 'value must be a valid priority level' },
            { status: 400 }
          )
        }
        updateData = { priority: body.value, updated_at: new Date().toISOString() }
        break
      case 'assign':
        updateData = { assignee_id: body.value || null, updated_at: new Date().toISOString() }
        break
      case 'tag':
        if (!body.value || !Array.isArray(body.value)) {
          return NextResponse.json(
            { success: false, error: 'value must be an array of tags' },
            { status: 400 }
          )
        }
        updateData = { tags: body.value, updated_at: new Date().toISOString() }
        break
      case 'delete':
        isDelete = true
        break
    }

    let updatedCount = 0
    let failedCount = 0
    const updatedTasks: any[] = []
    const errors: Array<{ id: string; error: string }> = []

    // Fetch tasks first to verify ownership and get current data
    const { data: tasksData, error: fetchError } = await supabase
      .from('work_items')
      .select('*')
      .in('id', body.taskIds)

    if (fetchError) {
      return NextResponse.json(
        { success: false, error: fetchError.message },
        { status: 500 }
      )
    }

    if (!tasksData || tasksData.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No tasks found' },
        { status: 404 }
      )
    }

    // Verify user has access to all tasks (check workspace ownership)
    const { data: userWorkspaces } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)

    const userWorkspaceIds = userWorkspaces?.map(w => w.workspace_id) || []

    const hasAccessToAllTasks = tasksData.every(task =>
      userWorkspaceIds.includes(task.workspace_id)
    )

    if (!hasAccessToAllTasks) {
      return NextResponse.json(
        { success: false, error: 'You do not have access to all selected tasks' },
        { status: 403 }
      )
    }

    // Perform batch operation
    if (isDelete) {
      // Delete operation
      const { error: deleteError } = await supabase
        .from('work_items')
        .delete()
        .in('id', body.taskIds)

      if (deleteError) {
        return NextResponse.json(
          { success: false, error: deleteError.message },
          { status: 500 }
        )
      }

      updatedCount = body.taskIds.length
    } else {
      // Update operation
      const { data: updated, error: updateError } = await supabase
        .from('work_items')
        .update(updateData)
        .in('id', body.taskIds)
        .select()

      if (updateError) {
        return NextResponse.json(
          { success: false, error: updateError.message },
          { status: 500 }
        )
      }

      updatedCount = updated?.length || 0
      if (updated) {
        updatedTasks.push(...updated)
      }
    }

    // Track any failures
    if (body.taskIds.length > updatedCount) {
      failedCount = body.taskIds.length - updatedCount
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          operation: body.operation,
          updated: updatedCount,
          failed: failedCount,
          tasks: updatedTasks,
          errors: errors.length > 0 ? errors : undefined,
        },
      },
      { status: 200 }
    )
  } catch (err: any) {
    console.error('Batch operations error:', err)
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    )
  }
}
