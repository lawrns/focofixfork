import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { authRequiredResponse } from '@/lib/api/response-helpers'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { user, supabase, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  const { searchParams } = new URL(req.url)
  const workspaceId = searchParams.get('workspace_id')
  const projectId = searchParams.get('project_id')

  // Note: no FK relationship between crons and foco_projects in schema cache — select without join
  let query = supabase
    .from('crons')
    .select('*')
    .order('created_at', { ascending: false })

  if (workspaceId) query = query.eq('workspace_id', workspaceId)
  if (projectId) query = query.eq('project_id', projectId)

  const { data, error: dbError } = await query

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  const { user, supabase, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  const body = await req.json()
  const { name, schedule, handler, payload, enabled, policy, project_id, workspace_id, metadata } = body

  if (!name || !schedule || !handler) {
    return NextResponse.json({ error: 'name, schedule, handler required' }, { status: 400 })
  }

  // Verify workspace access if workspace_id provided
  if (workspace_id) {
    const { data: member } = await supabase
      .from('foco_workspace_members')
      .select('role')
      .eq('workspace_id', workspace_id)
      .eq('user_id', user.id)
      .single()

    if (!member) {
      return NextResponse.json({ error: 'Access denied to workspace' }, { status: 403 })
    }
  }

  // Calculate next_run_at if schedule is provided
  let nextRunAt = null
  try {
    nextRunAt = calculateNextRun(schedule)
  } catch {
    // Invalid cron expression, will be caught or ignored
  }

  const { data, error: dbError } = await supabase
    .from('crons')
    .insert({
      name,
      schedule,
      handler,
      payload: payload ?? {},
      enabled: enabled ?? true,
      policy: policy ?? {},
      project_id: project_id ?? null,
      workspace_id: workspace_id ?? null,
      metadata: metadata ?? {},
      next_run_at: nextRunAt,
      last_status: 'pending',
    })
    .select('*')
    .single()

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  return NextResponse.json({ data }, { status: 201 })
}

// Simple cron next-run calculator
function calculateNextRun(schedule: string): string | null {
  try {
    const parts = schedule.trim().split(/\s+/)
    if (parts.length !== 5) return null

    const [min, hour] = parts
    const now = new Date()
    const next = new Date(now)

    // Simple cases only for now
    if (min === '*') {
      next.setMinutes(now.getMinutes() + 1)
    } else if (min.startsWith('*/')) {
      const interval = parseInt(min.slice(2))
      const currentMin = now.getMinutes()
      const nextMin = Math.ceil((currentMin + 1) / interval) * interval
      if (nextMin >= 60) {
        next.setHours(now.getHours() + 1)
        next.setMinutes(nextMin - 60)
      } else {
        next.setMinutes(nextMin)
      }
    } else {
      next.setMinutes(parseInt(min))
    }

    if (hour !== '*') {
      if (hour.startsWith('*/')) {
        // Handle interval hours
      } else {
        next.setHours(parseInt(hour))
        if (next <= now) {
          next.setDate(next.getDate() + 1)
        }
      }
    }

    return next.toISOString()
  } catch {
    return null
  }
}
