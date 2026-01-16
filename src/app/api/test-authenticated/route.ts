import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/api/auth-helper'
import { TaskActionService } from '@/lib/services/task-action-service'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    console.log('=== Test Authenticated AI Start ===')
    
    // Get authenticated user
    const { user, supabase, error: authError } = await getAuthUser(request)
    
    if (authError || !user) {
      console.log('Auth failed:', authError)
      return NextResponse.json({ error: 'Auth required', details: authError }, { status: 401 })
    }
    
    console.log('User authenticated:', user.id)
    
    // Test direct task query with user context
    console.log('Testing task query with user context...')
    const { data: task, error: taskError } = await supabase
      .from('work_items')
      .select('id, title, workspace_id')
      .eq('id', '8e20cc6c-eb78-4bcb-821a-9ce120bf61df')
      .single()
    
    console.log('Task query result:', { task: task?.title, error: taskError })
    
    if (taskError) {
      return NextResponse.json({ error: 'Task query failed', details: taskError }, { status: 500 })
    }
    
    // Test TaskActionService
    console.log('Creating TaskActionService...')
    const taskActionService = new TaskActionService(supabase)
    
    console.log('Calling generatePreview...')
    const preview = await taskActionService.generatePreview(
      { 
        action: 'suggest_subtasks', 
        task_id: '8e20cc6c-eb78-4bcb-821a-9ce120bf61df', 
        workspace_id: 'd7de1d3e-cae6-4210-ae4e-775fb84ddb7d' 
      },
      { version: 1 },
      user.id
    )
    
    console.log('Success! Execution ID:', preview.execution_id)
    
    return NextResponse.json({ 
      success: true,
      execution_id: preview.execution_id,
      task_title: task.title
    })
    
  } catch (error) {
    console.error('Test Authenticated Error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}
