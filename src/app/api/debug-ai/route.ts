import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/api/auth-helper'
import { TaskActionService } from '@/lib/services/task-action-service'
import { WorkspaceRepository } from '@/lib/repositories/workspace-repository'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const debugLog: any[] = []
  
  try {
    debugLog.push({ step: 'start', timestamp: new Date().toISOString() })
    
    // Get authenticated user
    const { user, supabase, error: authError, response: authResponse } = await getAuthUser(request)
    debugLog.push({ step: 'auth', userId: user?.id, error: authError })

    if (authError || !user) {
      debugLog.push({ step: 'auth_failed', error: authError })
      return NextResponse.json({ debugLog, error: 'Auth required' }, { status: 401 })
    }

    // Parse request
    const body = await request.json()
    debugLog.push({ step: 'parsed_body', body })

    // Check workspace access
    const workspaceRepo = new WorkspaceRepository(supabase)
    const isMemberResult = await workspaceRepo.isMember(body.workspace_id, user.id)
    debugLog.push({ step: 'workspace_check', workspaceId: body.workspace_id, isMember: isMemberResult.ok ? isMemberResult.data : null, error: isMemberResult.error })

    if (!isMemberResult.ok || !isMemberResult.data) {
      return NextResponse.json({ debugLog, error: 'Workspace access denied' }, { status: 403 })
    }

    // Get workspace policy
    const workspaceResult = await workspaceRepo.findById(body.workspace_id)
    debugLog.push({ step: 'workspace_policy', hasPolicy: !!workspaceResult.data?.ai_policy, error: workspaceResult.error })

    if (!workspaceResult.ok) {
      return NextResponse.json({ debugLog, error: 'Failed to get workspace' }, { status: 500 })
    }

    const policy = workspaceResult.data.ai_policy || {}

    // Test TaskActionService
    debugLog.push({ step: 'creating_service' })
    const taskActionService = new TaskActionService(supabase)
    
    debugLog.push({ step: 'calling_preview' })
    const preview = await taskActionService.generatePreview(
      { action: body.action, task_id: body.task_id, workspace_id: body.workspace_id },
      policy,
      user.id
    )
    
    debugLog.push({ step: 'success', executionId: preview.execution_id })

    return NextResponse.json({ 
      success: true, 
      debugLog,
      execution_id: preview.execution_id 
    })

  } catch (error) {
    debugLog.push({ 
      step: 'error', 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    
    return NextResponse.json({ 
      debugLog,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
