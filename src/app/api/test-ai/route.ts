import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/api/auth-helper'
import { TaskActionService } from '@/lib/services/task-action-service'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    console.log('=== Test AI API Start ===')
    
    // Get authenticated user
    const { user, supabase, error: authError, response: authResponse } = await getAuthUser(request)
    console.log('Auth result:', { user: user?.id, error: authError })

    if (authError || !user) {
      console.log('Auth failed:', authError)
      return NextResponse.json({ error: 'Auth required' }, { status: 401 })
    }

    // Test TaskActionService initialization
    console.log('Initializing TaskActionService...')
    const taskActionService = new TaskActionService(supabase)
    console.log('TaskActionService initialized')

    // Test simple AI call
    console.log('Testing AI service...')
    const testRequest = {
      action: 'suggest_subtasks' as const,
      task_id: '8e20cc6c-eb78-4bcb-821a-9ce120bf61df',
      workspace_id: 'd7de1d3e-cae6-4210-ae4e-775fb84ddb7d'
    }

    const policy = { version: 1 }
    const preview = await taskActionService.generatePreview(
      testRequest,
      policy,
      user.id
    )
    
    console.log('Preview generated:', preview.execution_id)

    return NextResponse.json({ 
      success: true, 
      execution_id: preview.execution_id 
    })

  } catch (error) {
    console.error('Test AI Error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}
