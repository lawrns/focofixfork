/**
 * /api/crons - Cron Management API (OpenClaw)
 * 
 * This route provides CRUD operations for managing cron job configurations
 * using OpenClaw's native cron system via WebSocket RPC.
 * 
 * Architecture:
 * - OpenClaw manages cron jobs internally (stored in ~/.openclaw/cron/)
 * - This API proxies requests to OpenClaw's gateway RPC endpoints
 * - Cron jobs can trigger agent turns or system events
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { authRequiredResponse } from '@/lib/api/response-helpers'
import {
  listOpenClawCrons,
  addOpenClawCron,
  parseCronExpression,
  formatSchedule,
  type OpenClawCronJob,
} from '@/lib/openclaw/cron-client'

export const dynamic = 'force-dynamic'

// Transform OpenClaw job to UI-friendly format
function transformJobForUI(job: OpenClawCronJob) {
  const schedule = formatSchedule(job.schedule)
  
  // Determine handler description from payload
  let handler = 'agent-turn'
  let description = job.description
  
  if (job.payload.kind === 'systemEvent') {
    handler = 'system-event'
    description = description || `System event: ${job.payload.text.slice(0, 50)}...`
  } else {
    description = description || `Agent: ${job.payload.message.slice(0, 50)}...`
  }
  
  // Map status
  let lastStatus: string | null = null
  if (job.state.lastRunStatus || job.state.lastStatus) {
    const status = job.state.lastRunStatus || job.state.lastStatus
    if (status === 'ok') lastStatus = 'completed'
    else if (status === 'error') lastStatus = 'failed'
    else if (status) lastStatus = status
  }
  
  return {
    id: job.id,
    name: job.name,
    schedule,
    schedule_kind: job.schedule.kind,
    handler,
    description,
    enabled: job.enabled,
    native: false, // All OpenClaw crons are user-managed
    last_run_at: job.state.lastRunAtMs ? new Date(job.state.lastRunAtMs).toISOString() : null,
    next_run_at: job.state.nextRunAtMs ? new Date(job.state.nextRunAtMs).toISOString() : null,
    last_status: lastStatus ?? null,
    created_at: new Date(job.createdAtMs).toISOString(),
    // OpenClaw-specific fields
    openclaw: {
      agentId: job.agentId,
      sessionTarget: job.sessionTarget,
      wakeMode: job.wakeMode,
      payloadKind: job.payload.kind,
      deliveryMode: job.delivery?.mode || 'none',
      consecutiveErrors: job.state.consecutiveErrors,
      lastDelivered: job.state.lastDelivered,
    }
  }
}

/**
 * GET /api/crons
 * List all cron jobs from OpenClaw
 */
export async function GET(req: NextRequest) {
  const { user, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  try {
    const { jobs, total } = await listOpenClawCrons({
      includeDisabled: true,
      limit: 100,
    })

    const data = jobs.map(transformJobForUI)

    return NextResponse.json({ data, count: total })
  } catch (err) {
    console.error('[crons] OpenClaw unreachable:', err instanceof Error ? err.message : err)
    return NextResponse.json({ 
      data: [], 
      count: 0, 
      error: 'OpenClaw unreachable. Is the gateway running?' 
    }, { status: 503 })
  }
}

/**
 * POST /api/crons
 * Create a new cron job on OpenClaw
 */
export async function POST(req: NextRequest) {
  const { user, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  try {
    const body = await req.json()
    const { name, schedule, description, enabled, message, agentId } = body

    if (!name || !schedule) {
      return NextResponse.json(
        { error: 'name and schedule are required' }, 
        { status: 400 }
      )
    }

    // Parse cron expression
    const cronSchedule = parseCronExpression(schedule)

    // Create the job with agentTurn payload
    const job = await addOpenClawCron({
      name: name.trim(),
      description: description?.trim(),
      enabled: enabled !== false,
      schedule: cronSchedule,
      payload: {
        kind: 'agentTurn',
        message: message || `Scheduled task: ${name}`,
        model: 'kimi-coding/k2p5',
        deliver: false,
      },
      sessionTarget: 'isolated',
      wakeMode: 'next-heartbeat',
      agentId: agentId || null,
      delivery: { mode: 'none' },
    })

    return NextResponse.json({ data: transformJobForUI(job) }, { status: 201 })
  } catch (err) {
    console.error('[crons] Create failed:', err instanceof Error ? err.message : err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create cron' },
      { status: 500 }
    )
  }
}
