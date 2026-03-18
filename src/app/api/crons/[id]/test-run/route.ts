import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { authRequiredResponse } from '@/lib/api/response-helpers'
import { listOpenClawCrons, runOpenClawCron } from '@/lib/openclaw/cron-client'

export const dynamic = 'force-dynamic'

/**
 * POST /api/crons/[id]/test-run
 *
 * Triggers a manual execution of a cron job via OpenClaw.
 * Uses OpenClaw's cron.run RPC method to execute the job immediately.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, supabase, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  // Fetch cron definition from OpenClaw
  let cron
  try {
    const { jobs } = await listOpenClawCrons({ includeDisabled: true, limit: 1000 })
    cron = jobs.find(c => c.id === params.id)
  } catch (err) {
    console.error('[crons/test-run] OpenClaw unreachable:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'OpenClaw unreachable' }, { status: 502 })
  }

  if (!cron) {
    return NextResponse.json({ error: 'Cron not found' }, { status: 404 })
  }

  // Trigger the run via OpenClaw
  try {
    const result = await runOpenClawCron(params.id, 'force')
    
    // Record ledger event
    await supabase.from('ledger_events').insert({
      type: 'cron_test_run',
      source: 'openclaw_crons',
      context_id: params.id,
      user_id: user.id,
      payload: {
        cron_name: cron.name,
        test: true,
        started: result.started,
      },
    })

    return NextResponse.json(
      {
        data: {
          cron: { id: cron.id, name: cron.name },
          started: result.started,
        },
      },
      { status: 201 }
    )
  } catch (err) {
    console.error('[crons/test-run] Failed to trigger run:', err instanceof Error ? err.message : err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to trigger test run' },
      { status: 502 }
    )
  }
}
