import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

function isAuthorized(req: NextRequest): boolean {
  const expected = process.env.N8N_WEBHOOK_SECRET ?? process.env.OPENCLAW_EVENT_SIGNING_SECRET ?? ''
  if (!expected) return false

  const candidate =
    req.headers.get('x-n8n-webhook-secret') ??
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ??
    ''

  if (!candidate) return false
  const a = Buffer.from(candidate)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

function normalizeStatus(raw: string | undefined): 'running' | 'completed' | 'failed' | 'cancelled' {
  const value = String(raw ?? '').toLowerCase()
  if (['success', 'completed', 'complete'].includes(value)) return 'completed'
  if (['error', 'failed', 'failure'].includes(value)) return 'failed'
  if (['cancelled', 'canceled', 'aborted'].includes(value)) return 'cancelled'
  return 'running'
}

function parseCallbackPayload(body: Record<string, unknown>) {
  const execution = (body.execution && typeof body.execution === 'object')
    ? (body.execution as Record<string, unknown>)
    : {}
  const workflow = (body.workflow && typeof body.workflow === 'object')
    ? (body.workflow as Record<string, unknown>)
    : {}

  const workflowId = String(
    body.workflow_id ??
    workflow.id ??
    body.workflowId ??
    ''
  )
  const workflowName = String(
    body.workflow_name ??
    workflow.name ??
    body.workflowName ??
    ''
  )
  const executionId = String(
    body.execution_id ??
    execution.id ??
    body.executionId ??
    ''
  )
  const status = normalizeStatus(
    String(body.status ?? execution.status ?? body.type ?? '')
  )
  const startedAt = String(
    body.started_at ??
    execution.startedAt ??
    execution.started_at ??
    new Date().toISOString()
  )
  const finishedAtRaw = body.finished_at ?? execution.stoppedAt ?? execution.finishedAt ?? execution.finished_at ?? null
  const finishedAt = finishedAtRaw ? String(finishedAtRaw) : null
  const outputSummary = String(body.output_summary ?? '')
  const errorMessage = String(body.error_message ?? execution.error ?? '')
  const errorNode = String(body.error_node ?? '')
  const agent = String(body.agent ?? 'unknown')

  return {
    workflowId,
    workflowName,
    executionId,
    status,
    startedAt,
    finishedAt,
    outputSummary,
    errorMessage,
    errorNode,
    agent,
    raw: body,
  }
}

async function ensureJob(workflowId: string, workflowName: string, agent: string) {
  const { data: existing } = await supabaseAdmin
    .from('automation_jobs')
    .select('id')
    .eq('external_id', workflowId)
    .maybeSingle()

  if (existing?.id) return existing.id as string

  const { data: inserted, error: insertErr } = await supabaseAdmin
    .from('automation_jobs')
    .insert({
      external_id: workflowId,
      name: workflowName || `n8n:${workflowId}`,
      description: 'Created from n8n callback sync',
      job_type: 'event_triggered',
      enabled: true,
      handler: `n8n.workflow.${workflowId}`,
      payload: {},
      policy: { source: 'n8n_callback' },
      metadata: { owner_agent: agent, source: 'n8n' },
      last_status: 'running',
    })
    .select('id')
    .single()

  if (insertErr || !inserted) {
    throw new Error(insertErr?.message || 'Failed to create automation job')
  }

  return inserted.id as string
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
  }

  const parsed = parseCallbackPayload(body as Record<string, unknown>)
  if (!parsed.workflowId || !parsed.executionId) {
    return NextResponse.json({ error: 'workflow_id and execution_id are required' }, { status: 400 })
  }

  try {
    const jobId = await ensureJob(parsed.workflowId, parsed.workflowName, parsed.agent)

    const { data: run, error: runErr } = await supabaseAdmin
      .from('automation_runs')
      .upsert({
        job_id: jobId,
        external_run_id: parsed.executionId,
        status: parsed.status,
        trigger_type: 'webhook',
        started_at: parsed.startedAt,
        ended_at: parsed.finishedAt,
        output: parsed.outputSummary ? { summary: parsed.outputSummary } : {},
        error: parsed.errorMessage || null,
        trace: parsed.raw,
        workflow_id: parsed.workflowId,
        workflow_name: parsed.workflowName || null,
        agent: parsed.agent || null,
        error_node: parsed.errorNode || null,
      }, {
        onConflict: 'external_run_id',
      })
      .select('*')
      .single()

    if (runErr || !run) {
      const message = runErr?.message || 'Failed to upsert automation run'
      if (message.includes('Could not find the table')) {
        return NextResponse.json(
          {
            error: 'Automation schema missing. Apply migrations (automation_jobs/automation_runs) before using n8n callback persistence.',
            details: message,
          },
          { status: 503 }
        )
      }
      return NextResponse.json({ error: message }, { status: 500 })
    }

    await supabaseAdmin
      .from('automation_jobs')
      .update({
        last_status: parsed.status,
        last_run_at: parsed.finishedAt || parsed.startedAt,
        enabled: parsed.status === 'cancelled' ? false : true,
      })
      .eq('id', jobId)

    const idempotencyKey = `n8n:${parsed.executionId}:${parsed.status}`
    const { error: ledgerErr } = await supabaseAdmin
      .from('ledger_events')
      .insert({
        type: parsed.status === 'failed' ? 'n8n.workflow.failed' : 'n8n.workflow.completed',
        source: 'n8n_callback',
        context_id: parsed.workflowId,
        payload: {
          workflow_id: parsed.workflowId,
          workflow_name: parsed.workflowName,
          execution_id: parsed.executionId,
          status: parsed.status,
          output_summary: parsed.outputSummary || null,
          error_message: parsed.errorMessage || null,
          error_node: parsed.errorNode || null,
          agent: parsed.agent,
        },
        automation_run_id: run.id,
        job_id: jobId,
        idempotency_key: idempotencyKey,
      })

    if (ledgerErr && !ledgerErr.message.includes('ledger_events_idempotency_key_uidx')) {
      return NextResponse.json({ error: ledgerErr.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, run_id: run.id })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Callback processing failed'
    if (message.includes('Could not find the table')) {
      return NextResponse.json(
        {
          error: 'Automation schema missing. Apply migrations (automation_jobs/automation_runs) before using n8n callback persistence.',
          details: message,
        },
        { status: 503 }
      )
    }
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
