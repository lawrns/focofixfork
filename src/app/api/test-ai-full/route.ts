import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/api/auth-helper'
import { WorkspaceRepository } from '@/lib/repositories/workspace-repository'
import { TaskActionService } from '@/lib/services/task-action-service'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    console.log('=== Test AI Full Start ===')
    
    // Step 1: Auth
    console.log('Step 1: Getting auth user...')
    const { user, supabase, error: authError } = await getAuthUser(request)
    
    if (authError || !user) {
      console.log('Auth failed:', authError)
      return NextResponse.json({ error: 'Auth required', details: authError }, { status: 401 })
    }
    console.log('Auth success for user:', user.id)

    // Step 2: Parse request
    const body = await request.json()
    console.log('Request body:', body)
    
    // Step 3: Check workspace access
    console.log('Step 3: Checking workspace access...')
    const workspaceRepo = new WorkspaceRepository(supabase)
    const isMemberResult = await workspaceRepo.isMember(body.workspace_id, user.id)
    
    if (!isMemberResult.ok || !isMemberResult.data) {
      console.log('Workspace access denied:', isMemberResult)
      return NextResponse.json({ error: 'Workspace access denied' }, { status: 403 })
    }
    console.log('Workspace access granted')

    // Step 4: Get workspace policy
    console.log('Step 4: Getting workspace policy...')
    const workspaceResult = await workspaceRepo.findById(body.workspace_id)
    
    if (!workspaceResult.ok) {
      console.log('Failed to get workspace:', workspaceResult.error)
      return NextResponse.json({ error: 'Failed to get workspace' }, { status: 500 })
    }
    
    const policy = workspaceResult.data.ai_policy || {}
    console.log('Workspace policy:', policy)

    // Step 5: Test TaskActionService
    console.log('Step 5: Creating TaskActionService...')
    const taskActionService = new TaskActionService(supabase)
    console.log('TaskActionService created')
    
    console.log('Step 6: Calling generatePreview...')
    const preview = await taskActionService.generatePreview(
      { action: body.action, task_id: body.task_id, workspace_id: body.workspace_id },
      policy,
      user.id
    )
    
    console.log('Success! Execution ID:', preview.execution_id)

    return NextResponse.json({ 
      success: true,
      execution_id: preview.execution_id
    })

  } catch (error) {
    console.error('Test AI Full Error:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack')
    
    // Check for specific errors
    if (error instanceof Error) {
      if (error.message.includes('API key not configured')) {
        return NextResponse.json({ error: 'AI API key not configured' }, { status: 503 })
      }
      if (error.message.includes('infinite recursion')) {
        return NextResponse.json({ error: 'Database RLS error' }, { status: 500 })
      }
    }
    
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}
