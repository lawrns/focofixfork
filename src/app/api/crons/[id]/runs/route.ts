import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { authRequiredResponse } from '@/lib/api/response-helpers'
import { getOpenClawCronRuns, type CronRunLogEntry } from '@/lib/openclaw/cron-client'

export const dynamic = 'force-dynamic'

// Transform OpenClaw run log to UI-friendly format
function transformRunForUI(run: CronRunLogEntry) {
  return {
    id: `${run.jobId}-${run.ts}`,
    timestamp: run.runAtMs ? new Date(run.runAtMs).toISOString() : new Date(run.ts).toISOString(),
    status: run.status === 'ok' ? 'completed' : run.status === 'error' ? 'failed' : run.status || 'unknown',
    error: run.error,
    summary: run.summary,
    delivered: run.delivered,
    deliveryStatus: run.deliveryStatus,
    durationMs: run.durationMs,
    model: run.model,
    provider: run.provider,
  }
}

/**
 * GET /api/crons/[id]/runs
 * Fetch run history from OpenClaw cron run logs.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  const { searchParams } = new URL(req.url)
  const limit = parseInt(searchParams.get('limit') || '20', 10)

  try {
    const result = await getOpenClawCronRuns(params.id, { limit })
    return NextResponse.json({ 
      data: result.runs.map(transformRunForUI), 
      count: result.total 
    })
  } catch (err) {
    console.error(`[crons] Runs fetch for ${params.id} failed:`, err instanceof Error ? err.message : err)
    return NextResponse.json(
      { data: [], count: 0, error: 'Failed to fetch run history from OpenClaw' },
      { status: 502 }
    )
  }
}
