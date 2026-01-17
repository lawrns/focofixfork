import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { TaskActionService, TaskActionType } from '@/lib/services/task-action-service'

export const dynamic = 'force-dynamic'

const ALL_ACTIONS: TaskActionType[] = [
  'suggest_subtasks',
  'draft_acceptance',
  'summarize_thread',
  'propose_next_step',
  'detect_blockers',
  'break_into_subtasks',
  'draft_update',
  'estimate_time',
  'find_similar'
]

export async function GET(request: NextRequest) {
  const results: any = {
    timestamp: new Date().toISOString(),
    actions: []
  }
  
  try {
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
    
    if (taskError || !task) {
      return NextResponse.json({ error: 'No task found', details: taskError }, { status: 500 })
    }
    
    const taskActionService = new TaskActionService(supabase)
    
    // Test each action type
    for (const action of ALL_ACTIONS) {
      try {
        const startTime = Date.now()
        const preview = await taskActionService.generatePreview(
          {
            action,
            task_id: task.id,
            workspace_id: task.workspace_id
          },
          { version: 1 },
          '60c44927-9d61-40e2-8c41-7e44cf7f7981'
        )
        
        results.actions.push({
          action,
          status: 'passed',
          latency_ms: Date.now() - startTime,
          execution_id: preview.execution_id,
          hasExplanation: !!preview.preview?.explanation,
          hasProposedChanges: !!preview.preview?.proposed_changes
        })
      } catch (error) {
        results.actions.push({
          action,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }
    
    // Summary
    const passed = results.actions.filter((a: any) => a.status === 'passed').length
    const failed = results.actions.filter((a: any) => a.status === 'failed').length
    
    results.summary = {
      total: results.actions.length,
      passed,
      failed,
      allPassed: failed === 0,
      task: { id: task.id, title: task.title }
    }
    
    return NextResponse.json(results)
    
  } catch (error) {
    results.error = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(results, { status: 500 })
  }
}
