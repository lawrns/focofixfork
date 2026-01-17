import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { TaskRepository } from '@/lib/repositories/task-repository'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  let authResponse: NextResponse | undefined;
  try {
    console.log('=== Test Task Repo Start ===')
    
    // Get authenticated user
    const { user, supabase, error: authError, response } = await getAuthUser(request)
    authResponse = response;
    
    if (authError || !user) {
      return mergeAuthResponse(NextResponse.json({ error: 'Auth required', details: authError }, { status: 401 }), authResponse)
    }
    
    console.log('User authenticated:', user.id)
    
    // Test task repository
    const taskRepo = new TaskRepository(supabase)
    console.log('Created TaskRepository')
    
    const taskId = '8e20cc6c-eb78-4bcb-821a-9ce120bf61df'
    console.log('Getting task with details for:', taskId)
    
    const taskResult = await taskRepo.getTaskWithDetails(taskId)
    console.log('Task result:', taskResult)
    
    if (!taskResult.ok) {
      return mergeAuthResponse(NextResponse.json({ error: 'Task not found', details: (taskResult as any).error || 'Unknown error' }, { status: 404 }), authResponse)
    }
    
    return mergeAuthResponse(NextResponse.json({ 
      success: true,
      task: {
        id: taskResult.data.id,
        title: taskResult.data.title,
        status: taskResult.data.status,
        workspace_id: taskResult.data.workspace_id
      }
    }), authResponse)
    
  } catch (error) {
    console.error('Test Task Repo Error:', error)
    return mergeAuthResponse(NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 }), authResponse)
  }
}
