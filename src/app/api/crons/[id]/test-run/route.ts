import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { authRequiredResponse } from '@/lib/api/response-helpers'
import { dispatchToClawdBot, buildSystemPrompt } from '@/lib/delegation/dispatchers'

export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, supabase, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  const { data: cron, error: fetchError } = await supabase
    .from('crons')
    .select('*')
    .eq('id', params.id)
    .single()

  if (fetchError || !cron) {
    return NextResponse.json({ error: 'Cron not found' }, { status: 404 })
  }

  // Create an automation_run for this cron test
  const { data: run, error: runError } = await supabase
    .from('automation_runs')
    .insert({
      job_id: params.id,
      status: 'pending',
      trigger_type: 'manual',
      started_at: new Date().toISOString(),
      trace: {
        cron_id: params.id,
        handler: cron.handler,
        test: true,
        triggered_by: user.id,
      },
    })
    .select()
    .single()

  if (runError) return NextResponse.json({ error: runError.message }, { status: 500 })

  // Also create a legacy run for backward compatibility
  const { data: legacyRun, error: legacyRunError } = await supabase
    .from('runs')
    .insert({
      runner: 'cron',
      status: 'pending',
      trace: { cron_id: params.id, handler: cron.handler, test: true, automation_run_id: run.id },
    })
    .select()
    .single()

  if (legacyRunError) {
    console.warn('Failed to create legacy run:', legacyRunError)
  }

  // Update cron last_status
  await supabase
    .from('crons')
    .update({
      last_status: 'pending',
      last_run_at: new Date().toISOString(),
    })
    .eq('id', params.id)

  // Dispatch to ClawdBot for actual execution
  const systemPrompt = buildSystemPrompt(
    cron.name ?? 'Cron Job',
    '',
    '',
    cron.name ?? 'Cron Job',
    cron.description ?? cron.handler
  )
  const dispatchResult = await dispatchToClawdBot({
    taskId: run.id,
    title: cron.name ?? `Cron: ${params.id}`,
    description: JSON.stringify({ handler: cron.handler, payload: cron.payload ?? {} }),
    projectContext: '',
    featureContext: '',
    systemPrompt,
    agentId: 'cron-executor',
  })

  // Persist external_run_id if dispatch succeeded
  if (dispatchResult.success && dispatchResult.externalRunId && legacyRun) {
    await supabase
      .from('runs')
      .update({ external_run_id: dispatchResult.externalRunId })
      .eq('id', legacyRun.id)
  }

  // Create ledger event for the test run
  await supabase.from('ledger_events').insert({
    type: 'cron_test_run',
    source: 'foco_crons',
    context_id: params.id,
    automation_run_id: run.id,
    user_id: user.id,
    workspace_id: cron.workspace_id,
    payload: {
      cron_name: cron.name,
      handler: cron.handler,
      test: true,
    },
  })

  return NextResponse.json(
    { data: { automation_run: run, legacy_run: legacyRun, cron } },
    { status: 201 }
  )
}
