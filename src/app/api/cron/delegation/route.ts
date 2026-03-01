import { NextRequest, NextResponse } from 'next/server'
import { executeTick, getDefaultConfig } from '@/lib/temporal/workflows/delegation-workflow'

export const dynamic = 'force-dynamic'

/**
 * GET /api/cron/delegation
 * Cron endpoint for triggering delegation tick
 * 
 * This endpoint is designed to be called by:
 * - Vercel Cron Jobs
 * - External cron services
 * - Internal heartbeat system
 * 
 * Requires CRON_SECRET header for authorization
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  const expectedSecret = process.env.CRON_SECRET

  if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const config = getDefaultConfig()
    const result = await executeTick(config)

    if (!result.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error,
          processed: result.processed
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      processed: result.processed,
      message: result.processed > 0 
        ? `Processed ${result.processed} work items`
        : 'No pending work items'
    })

  } catch (error) {
    console.error('Cron delegation error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/cron/delegation
 * Alternative POST endpoint for cron services that prefer POST
 */
export async function POST(request: NextRequest) {
  return GET(request)
}
