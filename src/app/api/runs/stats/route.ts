import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { authRequiredResponse } from '@/lib/api/response-helpers'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { user, supabase, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const { data: runs, error: dbError } = await supabase
    .from('runs')
    .select('id, status, created_at, started_at, cost_usd')
    .gte('created_at', todayStart.toISOString())

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  const runsToday = runs ?? []
  const pending = runsToday.filter(r => r.status === 'pending')
  const running = runsToday.filter(r => r.status === 'running')
  const completed = runsToday.filter(r => r.status === 'completed')

  const totalCostToday = runsToday.reduce((sum, r) => sum + (r.cost_usd ?? 0), 0)
  const avgCostPerRun = runsToday.length > 0 ? totalCostToday / runsToday.length : 0

  // Compute average wait time for pending runs (seconds since created_at)
  const now = Date.now()
  const pendingWaits = pending.map(r => (now - new Date(r.created_at).getTime()) / 1000)
  const avgPendingWaitSeconds = pendingWaits.length > 0
    ? pendingWaits.reduce((a, b) => a + b, 0) / pendingWaits.length
    : 0

  return NextResponse.json({
    data: {
      total_today: runsToday.length,
      pending: pending.length,
      running: running.length,
      completed_today: completed.length,
      total_cost_today: totalCostToday,
      avg_cost_per_run: avgCostPerRun,
      avg_pending_wait_seconds: avgPendingWaitSeconds,
    }
  })
}
