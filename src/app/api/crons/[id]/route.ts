import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { authRequiredResponse } from '@/lib/api/response-helpers'
import { patchClawdCron, deleteClawdCron } from '@/lib/clawdbot/crons-client'

export const dynamic = 'force-dynamic'

/**
 * PATCH /api/crons/[id]
 * Toggle cron enabled/disabled on ClawdBot.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  const body = await req.json()

  try {
    const cron = await patchClawdCron(params.id, { enabled: body.enabled })
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
