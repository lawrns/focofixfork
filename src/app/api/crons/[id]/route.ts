import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { authRequiredResponse } from '@/lib/api/response-helpers'
import { getClawdCrons, patchClawdCron, deleteClawdCron } from '@/lib/clawdbot/crons-client'

export const dynamic = 'force-dynamic'

/**
 * PATCH /api/crons/[id]
 * Update cron fields on ClawdBot.
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

  const patchBody: {
    enabled?: boolean
    name?: string
    schedule?: string
    description?: string | null
    handler?: string | null
  } = {}

  if (typeof body.enabled === 'boolean') patchBody.enabled = body.enabled
  if (typeof body.name === 'string') patchBody.name = body.name.trim()
  if (typeof body.schedule === 'string') patchBody.schedule = body.schedule.trim()
  if (typeof body.description === 'string') patchBody.description = body.description.trim()
  if (body.description === null) patchBody.description = null
  if (typeof body.handler === 'string') patchBody.handler = body.handler.trim()
  if (body.handler === null) patchBody.handler = null

  if (Object.keys(patchBody).length === 0) {
    return NextResponse.json({ error: 'No valid fields provided for update' }, { status: 400 })
  }

  if (patchBody.name !== undefined && !patchBody.name) {
    return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 })
  }
  if (patchBody.schedule !== undefined && !patchBody.schedule) {
    return NextResponse.json({ error: 'Schedule cannot be empty' }, { status: 400 })
  }

  try {
    const { crons } = await getClawdCrons()
    const current = crons.find((c) => c.id === params.id)
    if (!current) {
      return NextResponse.json({ error: 'Cron not found' }, { status: 404 })
    }
    if (current.native) {
      return NextResponse.json(
        { error: 'Native crons are managed by ClawdBot and cannot be edited here' },
        { status: 409 }
      )
    }

    const cron = await patchClawdCron(params.id, patchBody)
    return NextResponse.json({ data: cron })
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
 * Delete a user-created cron from ClawdBot.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  try {
    await deleteClawdCron(params.id)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error(`[crons] Delete ${params.id} failed:`, err instanceof Error ? err.message : err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to delete cron' },
      { status: 502 }
    )
  }
}
