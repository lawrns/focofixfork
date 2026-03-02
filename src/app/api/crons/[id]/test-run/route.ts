import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { authRequiredResponse } from '@/lib/api/response-helpers'
import { dispatchToClawdBot, buildSystemPrompt } from '@/lib/delegation/dispatchers'
import { getClawdCrons } from '@/lib/clawdbot/crons-client'

export const dynamic = 'force-dynamic'

/**
 * POST /api/crons/[id]/test-run
 *
 * Triggers a manual execution of a cron job.
 * Fetches cron definition from ClawdBot (source of truth), dispatches
 * to ClawdBot for execution, and records the run in the `runs` table.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, supabase, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  // Fetch cron definition from ClawdBot (single source of truth)
  let cron
  try {
    const { crons } = await getClawdCrons()
    cron = crons.find(c => c.id === params.id)
  } catch (err) {
    console.error('[crons/test-run] ClawdBot unreachable:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'ClawdBot unreachable' }, { status: 502 })
  }

  if (!cron) {
    return NextResponse.json({ error: 'Cron not found' }, { status: 404 })
  }

  // Create a run record for tracking
  const { data: run, error: runError } = await supabase
    .from('runs')
    .insert({
      runner: 'cron',
      status: 'pending',
      trace: {
        cron_id: params.id,
        cron_name: cron.name,
        handler: cron.handler,
        test: true,
        triggered_by: user.id,
      },
    })
    .select()
    .single()

  if (runError) {
    console.error('[crons/test-run] Failed to create run:', runError.message)
    return NextResponse.json({ error: runError.message }, { status: 500 })
  }

  // Dispatch to ClawdBot for execution
  const systemPrompt = buildSystemPrompt(
    cron.name,
    '',
    '',
    cron.name,
    cron.description || cron.handler
  )
  const dispatchResult = await dispatchToClawdBot({
    taskId: run.id,
    title: cron.name,
    description: JSON.stringify({ handler: cron.handler, cron_id: params.id }),
    projectContext: '',
    featureContext: '',
    systemPrompt,
    agentId: 'cron-executor',
  })

  // Persist external_run_id if dispatch succeeded
  if (dispatchResult.success && dispatchResult.externalRunId) {
    await supabase
      .from('runs')
      .update({ external_run_id: dispatchResult.externalRunId })
      .eq('id', run.id)
  }

  // Record ledger event
  await supabase.from('ledger_events').insert({
    type: 'cron_test_run',
    source: 'foco_crons',
    context_id: params.id,
    user_id: user.id,
    payload: {
      cron_name: cron.name,
      handler: cron.handler,
      run_id: run.id,
      external_run_id: dispatchResult.externalRunId ?? null,
      test: true,
    },
  })

  return NextResponse.json(
    {
      data: {
        run,
        cron: { id: cron.id, name: cron.name },
        dispatched: dispatchResult.success,
        external_run_id: dispatchResult.externalRunId ?? null,
      },
    },
    { status: 201 }
  )
}
