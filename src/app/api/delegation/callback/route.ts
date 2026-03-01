import { NextRequest, NextResponse } from 'next/server'
import { handleDelegationCallback } from '@/lib/delegation/delegation-engine'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

/**
 * Callback payload schema
 */
const CallbackSchema = z.object({
  workItemId: z.string().uuid(),
  runId: z.string().uuid(),
  status: z.enum(['completed', 'failed']),
  outputs: z.array(z.unknown()).optional().default([]),
  error: z.string().optional(),
  summary: z.string().optional(),
  metadata: z.record(z.unknown()).optional()
})

/**
 * POST /api/delegation/callback
 * Status Callback - Backends report completion
 * 
 * Backends report completion to this endpoint
 * Updates work_item status
 * Triggers ledger event
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate payload
    const validation = CallbackSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid payload',
          details: validation.error.format()
        },
        { status: 400 }
      )
    }

    const { workItemId, runId, status, outputs, error, summary } = validation.data

    // Handle the callback
    const success = await handleDelegationCallback(workItemId, status, {
      runId,
      outputs,
      error,
      summary
    })

    if (!success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to process callback'
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Work item ${workItemId} marked as ${status}`,
      workItemId,
      status
    })

  } catch (error) {
    console.error('Delegation callback error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}

/**
 * GET /api/delegation/callback
 * Health check endpoint
 */
export async function GET(_request: NextRequest) {
  return NextResponse.json({
    status: 'healthy',
    endpoint: '/api/delegation/callback',
    method: 'POST',
    description: 'Delegation callback endpoint for agent backends'
  })
}
