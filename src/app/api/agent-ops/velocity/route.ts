import { NextRequest } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import {
  authRequiredResponse,
  databaseErrorResponse,
  successResponse,
} from '@/lib/api/response-helpers'
import type { AgentOpsTaskRow } from '@/lib/agent-ops/types'

export const dynamic = 'force-dynamic'

function parseDays(req: NextRequest): number {
  const raw = Number(new URL(req.url).searchParams.get('days') ?? 14)
  if (!Number.isFinite(raw)) return 14
  return Math.max(1, Math.min(90, Math.floor(raw)))
}

function groupByDate(rows: AgentOpsTaskRow[]): Array<{ date: string; completed: number }> {
  const byDate = new Map<string, number>()
  for (const row of rows) {
    const key = row.updated_at.slice(0, 10)
    byDate.set(key, (byDate.get(key) ?? 0) + 1)
  }
  return Array.from(byDate.entries())
    .map(([date, completed]) => ({ date, completed }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

function toHours(start: string, end: string): number {
  const deltaMs = new Date(end).getTime() - new Date(start).getTime()
  if (!Number.isFinite(deltaMs) || deltaMs < 0) return 0
  return deltaMs / (1000 * 60 * 60)
}

export async function GET(req: NextRequest) {
  const { user, supabase, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  const days = parseDays(req)
  const since = new Date(Date.now() - (days * 24 * 60 * 60 * 1000)).toISOString()

  const { data, error: queryError } = await supabase
    .from('agent_ops_tasks')
    .select('*')
    .eq('user_id', user.id)
    .gte('created_at', since)
    .returns<AgentOpsTaskRow[]>()

  if (queryError) {
    return mergeAuthResponse(databaseErrorResponse('Failed to load velocity metrics', queryError.message), authResponse)
  }

  const rows = data ?? []
  const completed = rows.filter((row) => row.status === 'done')
  const inProgress = rows.filter((row) => row.status === 'in_progress')
  const blocked = rows.filter((row) => row.status === 'blocked')
  const donePerDay = groupByDate(completed)

  const cycleHours = completed
    .map((row) => toHours(row.created_at, row.updated_at))
    .filter((v) => v > 0)
  const avgCycleHours = cycleHours.length > 0
    ? cycleHours.reduce((sum, v) => sum + v, 0) / cycleHours.length
    : 0

  const throughputPerDay = donePerDay.length > 0
    ? completed.length / donePerDay.length
    : 0

  return mergeAuthResponse(successResponse({
    window_days: days,
    totals: {
      created: rows.length,
      completed: completed.length,
      in_progress: inProgress.length,
      blocked: blocked.length,
    },
    throughput_per_day: Number(throughputPerDay.toFixed(2)),
    average_cycle_time_hours: Number(avgCycleHours.toFixed(2)),
    completed_by_day: donePerDay,
  }), authResponse)
}
