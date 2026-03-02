import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { authRequiredResponse } from '@/lib/api/response-helpers'
import { getClawdCronRuns } from '@/lib/clawdbot/crons-client'

export const dynamic = 'force-dynamic'

/**
 * GET /api/crons/[id]/runs
 * Proxies to ClawdBot /crons/:id/runs for rich log-parsed run history.
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
    const result = await getClawdCronRuns(params.id, limit)
    return NextResponse.json({ data: result.runs, count: result.count })
  } catch (err) {
    console.error(`[crons] Runs fetch for ${params.id} failed:`, err instanceof Error ? err.message : err)
    return NextResponse.json(
      { data: [], count: 0, error: 'Failed to fetch run history from ClawdBot' },
      { status: 502 }
    )
  }
}
