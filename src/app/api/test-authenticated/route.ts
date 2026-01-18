import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { TaskActionService } from '@/lib/services/task-action-service'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  let authResponse: NextResponse | undefined;
  try {
    // Get authenticated user
    const { user, supabase, error: authError, response } = await getAuthUser(request)
    authResponse = response;

    if (authError || !user) {
      return mergeAuthResponse(NextResponse.json({ error: 'Auth required', details: authError }, { status: 401 }), authResponse)
    }

    // Test direct task query with user context
    const { data: task, error: taskError } = await supabase
      .from('work_items')
      .select('id, title, workspace_id')
      .eq('id', '8e20cc6c-eb78-4bcb-821a-9ce120bf61df')
      .single()

    if (taskError) {
      return mergeAuthResponse(NextResponse.json({ error: 'Task query failed', details: taskError }, { status: 500 }), authResponse)
    }

    // Test TaskActionService
    const taskActionService = new TaskActionService(supabase)

    const preview = await taskActionService.generatePreview(
      {
        action: 'suggest_subtasks',
        task_id: '8e20cc6c-eb78-4bcb-821a-9ce120bf61df',
        workspace_id: 'd7de1d3e-cae6-4210-ae4e-775fb84ddb7d'
      },
      { version: 1 },
      user.id
    )

    return mergeAuthResponse(NextResponse.json({
      success: true,
      execution_id: preview.execution_id,
      task_title: task.title
    }), authResponse)

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return mergeAuthResponse(NextResponse.json({
      error: message
    }, { status: 500 }), authResponse)
  }
}
