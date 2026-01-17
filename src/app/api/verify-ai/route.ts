import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { AIService } from '@/lib/services/ai-service'
import { TaskActionService } from '@/lib/services/task-action-service'

export const dynamic = 'force-dynamic'

// This endpoint uses service role to test AI functionality without browser auth
export async function GET(request: NextRequest) {
  const results: any = {
    timestamp: new Date().toISOString(),
    tests: []
  }
  
  try {
    // Test 1: Environment variables
    results.tests.push({
      name: 'Environment Variables',
      status: 'running'
    })
    
    const envCheck = {
      DEEPSEEK_API_KEY: !!process.env.DEEPSEEK_API_KEY,
      DEEPSEEK_MODEL: process.env.DEEPSEEK_MODEL,
      SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SERVICE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    }
    
    results.tests[0] = {
      name: 'Environment Variables',
      status: 'passed',
      data: envCheck
    }
    
    // Test 2: AI Service initialization
    results.tests.push({
      name: 'AI Service Init',
      status: 'running'
    })
    
    const aiService = new AIService()
    const providerInfo = aiService.getProviderInfo()
    
    results.tests[1] = {
      name: 'AI Service Init',
      status: 'passed',
      data: providerInfo
    }
    
    // Test 3: AI Chat Completion
    results.tests.push({
      name: 'AI Chat Completion',
      status: 'running'
    })
    
    const aiResponse = await aiService.chatCompletion([
      { role: 'user', content: 'Say "AI is working" in exactly 3 words.' }
    ])
    
    results.tests[2] = {
      name: 'AI Chat Completion',
      status: 'passed',
      data: { response: aiResponse.substring(0, 100) }
    }
    
    // Test 4: Database connection with service role
    results.tests.push({
      name: 'Database Connection',
      status: 'running'
    })
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    // Get a task to test with
    const { data: task, error: taskError } = await supabase
      .from('work_items')
      .select('id, title, workspace_id')
      .limit(1)
      .single()
    
    if (taskError) {
      results.tests[3] = {
        name: 'Database Connection',
        status: 'failed',
        error: taskError.message
      }
    } else {
      results.tests[3] = {
        name: 'Database Connection',
        status: 'passed',
        data: { taskId: task.id, taskTitle: task.title }
      }
    }
    
    // Test 5: TaskActionService with real task
    if (task) {
      results.tests.push({
        name: 'TaskActionService',
        status: 'running'
      })
      
      try {
        const taskActionService = new TaskActionService(supabase)
        const preview = await taskActionService.generatePreview(
          {
            action: 'suggest_subtasks',
            task_id: task.id,
            workspace_id: task.workspace_id
          },
          { version: 1 },
          '60c44927-9d61-40e2-8c41-7e44cf7f7981' // Test user ID
        )
        
        results.tests[4] = {
          name: 'TaskActionService',
          status: 'passed',
          data: {
            execution_id: preview.execution_id,
            hasPreview: !!preview.preview,
            explanation: preview.preview?.explanation?.substring(0, 100)
          }
        }
      } catch (error) {
        results.tests[4] = {
          name: 'TaskActionService',
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack?.split('\n').slice(0, 3) : undefined
        }
      }
    }
    
    // Summary
    const passed = results.tests.filter((t: any) => t.status === 'passed').length
    const failed = results.tests.filter((t: any) => t.status === 'failed').length
    
    results.summary = {
      total: results.tests.length,
      passed,
      failed,
      allPassed: failed === 0
    }
    
    return NextResponse.json(results)
    
  } catch (error) {
    results.error = error instanceof Error ? error.message : 'Unknown error'
    results.stack = error instanceof Error ? error.stack?.split('\n').slice(0, 5) : undefined
    return NextResponse.json(results, { status: 500 })
  }
}
