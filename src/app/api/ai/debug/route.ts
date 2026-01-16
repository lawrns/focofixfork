import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/api/auth-helper'
import { WorkspaceRepository } from '@/lib/repositories/workspace-repository'
import { TaskActionService } from '@/lib/services/task-action-service'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const logs: string[] = []
  
  try {
    logs.push('=== AI Debug Start ===')
    
    // Step 1: Auth
    logs.push('Step 1: Getting auth user...')
    const { user, supabase, error: authError } = await getAuthUser(request)
    
    if (authError || !user) {
      logs.push(`Auth failed: ${authError}`)
      return NextResponse.json({ logs, error: 'Auth required' }, { status: 401 })
    }
    logs.push(`Auth success for user: ${user.id}`)

    // Step 2: Parse request
    const body = await request.json()
    logs.push(`Request body: ${JSON.stringify(body)}`)
    
    // Step 3: Check workspace access
    logs.push('Step 3: Checking workspace access...')
    const workspaceRepo = new WorkspaceRepository(supabase)
    const isMemberResult = await workspaceRepo.isMember(body.workspace_id, user.id)
    
    if (!isMemberResult.ok || !isMemberResult.data) {
      logs.push(`Workspace access denied: ${JSON.stringify(isMemberResult)}`)
      return NextResponse.json({ logs, error: 'Workspace access denied' }, { status: 403 })
    }
    logs.push('Workspace access granted')

    // Step 4: Get workspace policy
    logs.push('Step 4: Getting workspace policy...')
    const workspaceResult = await workspaceRepo.findById(body.workspace_id)
    
    if (!workspaceResult.ok) {
      logs.push(`Failed to get workspace: ${JSON.stringify(workspaceResult)}`)
      return NextResponse.json({ logs, error: 'Failed to get workspace' }, { status: 500 })
    }
    
    const policy = workspaceResult.data.ai_policy || {}
    logs.push(`Workspace policy: ${JSON.stringify(policy)}`)

    // Step 5: Test TaskActionService with detailed error capture
    logs.push('Step 5: Creating TaskActionService...')
    const taskActionService = new TaskActionService(supabase)
    logs.push('TaskActionService created')
    
    logs.push('Step 6: Calling generatePreview...')
    
    // Capture any console.log output
    const originalConsoleLog = console.log
    const consoleLogs: string[] = []
    console.log = (...args: any[]) => {
      consoleLogs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '))
      originalConsoleLog(...args)
    }
    
    try {
      const preview = await taskActionService.generatePreview(
        { action: body.action, task_id: body.task_id, workspace_id: body.workspace_id },
        policy,
        user.id
      )
      
      console.log = originalConsoleLog
      
      logs.push('Success! Execution ID: ' + preview.execution_id)
      logs.push('Console logs: ' + consoleLogs.join('\n'))

      return NextResponse.json({ 
        success: true,
        logs,
        consoleLogs,
        execution_id: preview.execution_id
      })
      
    } catch (error) {
      console.log = originalConsoleLog
      logs.push(`generatePreview failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      logs.push('Console logs before error: ' + consoleLogs.join('\n'))
      throw error
    }

  } catch (error) {
    logs.push(`Final error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    logs.push(`Error stack: ${error instanceof Error ? error.stack : 'No stack'}`)
    
    return NextResponse.json({ 
      logs,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}
