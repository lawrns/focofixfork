import { NextRequest, NextResponse } from 'next/server'
import { 
  getPendingWorkItems, 
  processDelegation,
  DelegationContext 
} from '@/lib/delegation/delegation-engine'

export const dynamic = 'force-dynamic'

/**
 * POST /api/delegation/process
 * Delegation Tick API - processes pending work items
 * 
 * Query work_items with delegation_status='pending' + enabled project policies
 * Match to available agent from assigned_agent_pool (['clawdbot', 'bosun'])
 * Read handbook files from ~/clawdbot/skills/{project.slug}/
 * Inject handbook into dispatch payload
 * Dispatch to correct backend
 * Update status: pending → delegated → running → completed/failed
 */
export async function POST(_request: NextRequest) {
  const startTime = Date.now()
  const results: Array<{
    workItemId: string
    success: boolean
    agent?: string
    runId?: string
    error?: string
  }> = []
  let processed = 0
  let succeeded = 0
  let failed = 0

  try {
    // 1. Get pending work items with enabled delegation policies
    const pendingItems = await getPendingWorkItems()

    if (pendingItems.length === 0) {
      return NextResponse.json({
        success: true,
        processed: 0,
        message: 'No pending work items to delegate'
      })
    }

    // 2. Process each pending item
    for (const item of pendingItems) {
      processed++
      
      const result = await processDelegation(item)
      
      results.push({
        workItemId: item.workItemId,
        success: result.success,
        agent: result.agent,
        runId: result.runId,
        error: result.error
      })

      if (result.success) {
        succeeded++
      } else {
        failed++
      }
    }

    const duration = Date.now() - startTime

    return NextResponse.json({
      success: true,
      processed,
      succeeded,
      failed,
      duration_ms: duration,
      results
    })

  } catch (error) {
    console.error('Delegation process error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    
    return NextResponse.json(
      { 
        success: false, 
        error: message,
        processed,
        succeeded,
        failed,
        results
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/delegation/process
 * Health check endpoint for the delegation tick API
 */
export async function GET(_request: NextRequest) {
  return NextResponse.json({
    status: 'healthy',
    endpoint: '/api/delegation/process',
    method: 'POST',
    description: 'Delegation Tick API - processes pending work items'
  })
}
