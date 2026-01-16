import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/api/auth-helper'
import { TaskRepository } from '@/lib/repositories/task-repository'
import { WorkspaceRepository } from '@/lib/repositories/workspace-repository'
import { AIService } from '@/lib/services/ai-service'
import { isError } from '@/lib/repositories/base-repository'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const steps: any[] = []
  
  try {
    const body = await request.json()
    steps.push({ step: 'request_body', data: body })

    // Step 1: Auth
    const { user, supabase, error: authError } = await getAuthUser(request)
    
    if (authError || !user) {
      steps.push({ step: 'auth_failed', error: authError })
      return NextResponse.json({ steps, error: 'Auth required' }, { status: 401 })
    }
    steps.push({ step: 'auth_success', userId: user.id, email: user.email })

    // Step 2: Check workspace membership
    const workspaceRepo = new WorkspaceRepository(supabase)
    const isMemberResult = await workspaceRepo.isMember(body.workspace_id, user.id)
    steps.push({ step: 'workspace_check', result: isMemberResult })
    
    if (!isMemberResult.ok || !isMemberResult.data) {
      return NextResponse.json({ steps, error: 'Not a workspace member' }, { status: 403 })
    }

    // Step 3: Get task
    const taskRepo = new TaskRepository(supabase)
    const taskResult = await taskRepo.getTaskWithDetails(body.task_id)
    steps.push({ step: 'task_query', ok: taskResult.ok, hasData: !!taskResult.ok && !!taskResult.data })
    
    if (isError(taskResult)) {
      steps.push({ step: 'task_error', error: taskResult.error })
      return NextResponse.json({ steps, error: 'Task not found' }, { status: 404 })
    }
    steps.push({ step: 'task_found', title: taskResult.data.title })

    // Step 4: Test AI Service
    const aiService = new AIService()
    steps.push({ step: 'ai_service_created', provider: aiService.getProviderInfo() })
    
    const aiResponse = await aiService.chatCompletion([
      { role: 'user', content: `For task "${taskResult.data.title}", suggest 3 subtasks. Reply in JSON format: {"subtasks": ["task1", "task2", "task3"]}` }
    ])
    steps.push({ step: 'ai_response', response: aiResponse.substring(0, 200) })

    return NextResponse.json({ 
      success: true,
      steps,
      ai_response: aiResponse
    })

  } catch (error) {
    steps.push({ 
      step: 'error', 
      message: error instanceof Error ? error.message : 'Unknown',
      stack: error instanceof Error ? error.stack?.split('\n').slice(0, 5) : undefined
    })
    return NextResponse.json({ steps }, { status: 500 })
  }
}
