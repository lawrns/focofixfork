import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { authRequiredResponse } from '@/lib/api/response-helpers'
import {
  listOpenClawCrons,
  updateOpenClawCron,
  removeOpenClawCron,
  parseCronExpression,
  formatSchedule,
  type OpenClawCronJob,
} from '@/lib/openclaw/cron-client'

export const dynamic = 'force-dynamic'

// Transform OpenClaw job to UI-friendly format
function transformJobForUI(job: OpenClawCronJob) {
  const schedule = formatSchedule(job.schedule)
  
  let handler = 'agent-turn'
  let description = job.description
  
  if (job.payload.kind === 'systemEvent') {
    handler = 'system-event'
    description = description || `System event: ${job.payload.text.slice(0, 50)}...`
  } else {
    description = description || `Agent: ${job.payload.message.slice(0, 50)}...`
  }
  
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
    native: false,
    last_run_at: job.state.lastRunAtMs ? new Date(job.state.lastRunAtMs).toISOString() : null,
    next_run_at: job.state.nextRunAtMs ? new Date(job.state.nextRunAtMs).toISOString() : null,
    last_status: lastStatus ?? null,
    created_at: new Date(job.createdAtMs).toISOString(),
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
 * GET /api/crons/[id]
 * Fetch a single cron from OpenClaw by id.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  try {
    const { jobs } = await listOpenClawCrons({ includeDisabled: true, limit: 1000 })
    const job = jobs.find((item) => item.id === params.id)
    if (!job) return NextResponse.json({ error: 'Cron not found' }, { status: 404 })
    return NextResponse.json({ data: transformJobForUI(job) })
  } catch (err) {
    console.error(`[crons] Get ${params.id} failed:`, err instanceof Error ? err.message : err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch cron' },
      { status: 502 }
    )
  }
}

/**
 * PATCH /api/crons/[id]
 * Update cron fields on OpenClaw.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
  }

  const patch: Parameters<typeof updateOpenClawCron>[1] = {}

  if (typeof body.enabled === 'boolean') patch.enabled = body.enabled
  if (typeof body.name === 'string') patch.name = body.name.trim()
  if (typeof body.schedule === 'string') {
    patch.schedule = parseCronExpression(body.schedule.trim())
  }
  if (typeof body.description === 'string') patch.description = body.description.trim()
  if (body.description === null) patch.description = null

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'No valid fields provided for update' }, { status: 400 })
  }

  if (patch.name !== undefined && !patch.name) {
    return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 })
  }

  try {
    // Verify job exists
    const { jobs } = await listOpenClawCrons({ includeDisabled: true, limit: 1000 })
    const current = jobs.find((c) => c.id === params.id)
    if (!current) {
      return NextResponse.json({ error: 'Cron not found' }, { status: 404 })
    }

    const job = await updateOpenClawCron(params.id, patch)

    return NextResponse.json({ data: transformJobForUI(job) })
  } catch (err) {
    console.error(`[crons] Patch ${params.id} failed:`, err instanceof Error ? err.message : err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update cron' },
      { status: 502 }
    )
  }
}

/**
 * DELETE /api/crons/[id]
 * Delete a cron job from OpenClaw.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  try {
    await removeOpenClawCron(params.id)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error(`[crons] Delete ${params.id} failed:`, err instanceof Error ? err.message : err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to delete cron' },
      { status: 502 }
    )
  }
}
