/**
 * /api/crons - Cron Management API
 * 
 * NAMING DISTINCTION:
 * - /api/crons/ (this file, PLURAL) = Management API for cron schedules
 * - /api/cron/ (SINGULAR) = Individual cron job handler implementations
 * 
 * This route provides CRUD operations for managing cron job configurations.
 * The actual job handlers live in /api/cron/<handler-name>/route.ts
 * 
 * Why both exist:
 * - /api/crons/* manages WHEN jobs run (schedule, enable/disable)
 * - /api/cron/* defines WHAT runs (the actual business logic)
 * 
 * Architecture:
 * - This API proxies to ClawdBot for persistence
 * - ClawdBot manages crons.json and system crontab
 * - When a cron fires, ClawdBot calls the appropriate /api/cron/<handler>
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { authRequiredResponse } from '@/lib/api/response-helpers'
import { getClawdCrons, createClawdCron } from '@/lib/clawdbot/crons-client'
import { logClawdActionVisibility } from '@/lib/cofounder-mode/clawd-visibility'

export const dynamic = 'force-dynamic'

/**
 * GET /api/crons
 * Primary source: ClawdBot (live cron status from log files).
 * Falls back to empty array if ClawdBot unreachable.
 */
export async function GET(req: NextRequest) {
  const { user, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  try {
    const { crons, count } = await getClawdCrons()

    // Transform to the shape the UI expects
    const data = crons.map(c => ({
      id: c.id,
      name: c.name,
      schedule: c.schedule,
      handler: c.handler,
      description: c.description,
      enabled: c.enabled,
      native: c.native,
      last_run_at: c.last_run_at,
      last_status: c.last_status,
      next_run_at: c.next_run_at,
      created_at: c.created_at,
    }))

    return NextResponse.json({ data, count })
  } catch (err) {
    console.error('[crons] ClawdBot unreachable:', err instanceof Error ? err.message : err)
    return NextResponse.json({ data: [], count: 0, error: 'ClawdBot unreachable' })
  }
}

/**
 * POST /api/crons
 * Creates a new cron on ClawdBot (writes crons.json + crontab entry).
 */
export async function POST(req: NextRequest) {
  const { user, supabase, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  const body = await req.json()
  const { name, schedule, handler, description, enabled } = body

  if (!name || !schedule) {
    return NextResponse.json({ error: 'name and schedule are required' }, { status: 400 })
  }

  try {
    const cron = await createClawdCron({
      name,
      schedule,
      handler: handler || undefined,
      description: description || undefined,
      enabled: enabled !== false,
    })

    await logClawdActionVisibility(supabase, {
      userId: user.id,
      eventType: 'clawd_cron_created',
      title: `Created cron: ${cron.name}`,
      detail: cron.schedule,
      contextId: cron.id,
      payload: {
        cron,
      },
    })

    return NextResponse.json({ data: cron }, { status: 201 })
  } catch (err) {
    console.error('[crons] Create failed:', err instanceof Error ? err.message : err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create cron' },
      { status: 502 }
    )
  }
}
