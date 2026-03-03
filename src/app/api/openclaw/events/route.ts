import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { authorizeOpenClawRequest } from '@/lib/security/openclaw-auth'

export const dynamic = 'force-dynamic'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// POST /api/openclaw/events — ingest automation events
export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  if (!authorizeOpenClawRequest(req, rawBody)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown> = {}
  try {
    body = rawBody ? JSON.parse(rawBody) : {}
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const {
    type,
    source,
    context_id,
    correlation_id,
    causation_id,
    payload,
    run_id,
    artifacts,
    workspace_id,
    user_id,
    // Automation-specific fields
    job_run,
    email_send,
    automation_run_id,
    email_delivery_id,
    job_id,
  } = body as Record<string, any>

  if (!type || !source) {
    return NextResponse.json({ error: 'type and source required' }, { status: 400 })
  }

  const supabase = supabaseAdmin()
  const idempotencyCandidate =
    req.headers.get('x-idempotency-key') ??
    body.idempotency_key ??
    null
  const idempotencyKey =
    typeof idempotencyCandidate === 'string' && idempotencyCandidate.trim().length > 0
      ? idempotencyCandidate
      : null

  if (idempotencyKey) {
    const { data: existingEvent } = await supabase
      .from('ledger_events')
      .select('*')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle()

    if (existingEvent) {
      return NextResponse.json({ data: existingEvent, idempotent: true }, { status: 200 })
    }
  }

  // Handle job_run events (automation job execution)
  if (job_run) {
    return handleJobRunEvent(supabase, job_run, {
      type,
      source,
      context_id,
      correlation_id,
      causation_id,
      payload,
      workspace_id,
      user_id,
      idempotency_key: idempotencyKey ?? undefined,
    })
  }

  // Handle email_send events
  if (email_send) {
    return handleEmailSendEvent(supabase, email_send, {
      type,
      source,
      context_id,
      correlation_id,
      causation_id,
      payload,
      workspace_id,
      user_id,
      idempotency_key: idempotencyKey ?? undefined,
    })
  }

  // Write ledger event with optional automation links
  const { data: ledgerEvent, error: ledgerError } = await supabase
    .from('ledger_events')
    .insert({
      type,
      source,
      context_id: context_id ?? null,
      correlation_id: correlation_id ?? null,
      causation_id: causation_id ?? null,
      workspace_id: workspace_id ?? null,
      user_id: user_id ?? null,
      automation_run_id: automation_run_id ?? null,
      email_delivery_id: email_delivery_id ?? null,
      job_id: job_id ?? null,
      payload: payload ?? {},
      idempotency_key: idempotencyKey,
    })
    .select()
    .single()

  if (ledgerError) {
    return NextResponse.json({ error: ledgerError.message }, { status: 500 })
  }

  // Optionally update run status
  if (run_id && payload?.status) {
    await supabase
      .from('runs')
      .update({ status: payload.status, summary: payload.summary ?? null })
      .eq('id', run_id)
  }

  // Optionally create artifacts (screenshots/logs)
  if (artifacts && Array.isArray(artifacts) && artifacts.length > 0) {
    const rows = artifacts.map((a: { type: string; uri: string; meta?: Record<string, unknown> }) => ({
      run_id: run_id ?? null,
      type: a.type,
      uri: a.uri,
      meta: a.meta ?? {},
    }))
    await supabase.from('artifacts').insert(rows)
  }

  return NextResponse.json({ data: ledgerEvent }, { status: 201 })
}

// Handle job_run events - create/update automation_runs and link to jobs
async function handleJobRunEvent(
  supabase: ReturnType<typeof supabaseAdmin>,
  jobRun: {
    job_id: string
    external_job_id?: string
    external_run_id?: string
    status: string
    trigger_type?: string
    started_at?: string
    ended_at?: string
    duration_ms?: number
    logs?: unknown[]
    output?: Record<string, unknown>
    error?: string
    trace?: Record<string, unknown>
  },
  eventMeta: {
    type: string
    source: string
    context_id?: string
    correlation_id?: string
    causation_id?: string
    payload?: Record<string, unknown>
    workspace_id?: string
    user_id?: string
    idempotency_key?: string
  }
) {
  // First, try to find the automation job by external_id
  let automationJobId = jobRun.job_id
  const { data: existingJob } = await supabase
    .from('automation_jobs')
    .select('id')
    .eq('external_id', jobRun.external_job_id || jobRun.job_id)
    .maybeSingle()

  if (existingJob) {
    automationJobId = existingJob.id
  }

  // Check if this run already exists (by external_run_id)
  let automationRunId: string | undefined
  if (jobRun.external_run_id) {
    const { data: existingRun } = await supabase
      .from('automation_runs')
      .select('id')
      .eq('external_run_id', jobRun.external_run_id)
      .maybeSingle()

    if (existingRun) {
      automationRunId = existingRun.id
    }
  }

  let runResult
  if (automationRunId) {
    // Update existing run
    const { data, error } = await supabase
      .from('automation_runs')
      .update({
        status: jobRun.status,
        started_at: jobRun.started_at ?? null,
        ended_at: jobRun.ended_at ?? null,
        duration_ms: jobRun.duration_ms ?? null,
        logs: jobRun.logs ?? [],
        output: jobRun.output ?? {},
        error: jobRun.error ?? null,
        trace: jobRun.trace ?? {},
        updated_at: new Date().toISOString(),
      })
      .eq('id', automationRunId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    runResult = data
  } else {
    // Create new run
    const { data, error } = await supabase
      .from('automation_runs')
      .insert({
        job_id: automationJobId,
        external_run_id: jobRun.external_run_id ?? null,
        status: jobRun.status,
        trigger_type: jobRun.trigger_type || 'scheduled',
        started_at: jobRun.started_at ?? null,
        ended_at: jobRun.ended_at ?? null,
        duration_ms: jobRun.duration_ms ?? null,
        logs: jobRun.logs ?? [],
        output: jobRun.output ?? {},
        error: jobRun.error ?? null,
        trace: jobRun.trace ?? {},
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    runResult = data
    automationRunId = data.id
  }

  // Update automation_jobs with last_run info
  await supabase
    .from('automation_jobs')
    .update({
      last_run_at: jobRun.ended_at || jobRun.started_at || new Date().toISOString(),
      last_status: jobRun.status,
    })
    .eq('id', automationJobId)

  // Write ledger event linked to automation run
  const { data: ledgerEvent, error: ledgerError } = await supabase
    .from('ledger_events')
    .insert({
      type: eventMeta.type,
      source: eventMeta.source,
      context_id: eventMeta.context_id ?? null,
      correlation_id: eventMeta.correlation_id ?? null,
      causation_id: eventMeta.causation_id ?? null,
      workspace_id: eventMeta.workspace_id ?? null,
      user_id: eventMeta.user_id ?? null,
      automation_run_id: automationRunId,
      job_id: automationJobId,
      payload: {
        ...eventMeta.payload,
        job_run: jobRun,
      },
      idempotency_key: eventMeta.idempotency_key ?? null,
    })
    .select()
    .single()

  if (ledgerError) {
    return NextResponse.json({ error: ledgerError.message }, { status: 500 })
  }

  return NextResponse.json(
    { data: { run: runResult, ledger_event: ledgerEvent } },
    { status: 201 }
  )
}

// Handle email_send events
async function handleEmailSendEvent(
  supabase: ReturnType<typeof supabaseAdmin>,
  emailSend: {
    to: string[]
    cc?: string[]
    bcc?: string[]
    subject: string
    body_md: string
    body_html?: string
    status?: string
    provider?: string
    automation_run_id?: string
    task_id?: string
    project_id?: string
    workspace_id?: string
    metadata?: Record<string, unknown>
  },
  eventMeta: {
    type: string
    source: string
    context_id?: string
    correlation_id?: string
    causation_id?: string
    payload?: Record<string, unknown>
    workspace_id?: string
    user_id?: string
    idempotency_key?: string
  }
) {
  const wsId = emailSend.workspace_id || eventMeta.workspace_id

  // Create email delivery record
  const { data: delivery, error: deliveryError } = await supabase
    .from('email_deliveries')
    .insert({
      to: emailSend.to,
      cc: emailSend.cc ?? [],
      bcc: emailSend.bcc ?? [],
      subject: emailSend.subject,
      body_md: emailSend.body_md,
      body_html: emailSend.body_html ?? null,
      status: emailSend.status || 'queued',
      provider: emailSend.provider ?? null,
      automation_run_id: emailSend.automation_run_id ?? null,
      task_id: emailSend.task_id ?? null,
      project_id: emailSend.project_id ?? null,
      workspace_id: wsId ?? null,
      metadata: emailSend.metadata ?? {},
    })
    .select()
    .single()

  if (deliveryError) {
    return NextResponse.json({ error: deliveryError.message }, { status: 500 })
  }

  // Also add to outbox for backward compatibility
  const { data: outboxItem, error: outboxError } = await supabase
    .from('email_outbox')
    .insert({
      to: emailSend.to,
      cc: emailSend.cc ?? [],
      bcc: emailSend.bcc ?? [],
      subject: emailSend.subject,
      body_md: emailSend.body_md,
      body_html: emailSend.body_html ?? null,
      status: emailSend.status || 'queued',
      automation_run_id: emailSend.automation_run_id ?? null,
      task_id: emailSend.task_id ?? null,
      project_id: emailSend.project_id ?? null,
      workspace_id: wsId ?? null,
    })
    .select()
    .single()

  if (outboxError) {
    // Non-fatal, just log
    console.warn('Failed to create outbox entry:', outboxError)
  }

  // Update delivery with outbox reference
  if (outboxItem) {
    await supabase
      .from('email_deliveries')
      .update({ outbox_id: outboxItem.id })
      .eq('id', delivery.id)
  }

  // Write ledger event linked to email delivery
  const { data: ledgerEvent, error: ledgerError } = await supabase
    .from('ledger_events')
    .insert({
      type: eventMeta.type,
      source: eventMeta.source,
      context_id: eventMeta.context_id ?? null,
      correlation_id: eventMeta.correlation_id ?? null,
      causation_id: eventMeta.causation_id ?? null,
      workspace_id: wsId ?? null,
      user_id: eventMeta.user_id ?? null,
      email_delivery_id: delivery.id,
      automation_run_id: emailSend.automation_run_id ?? null,
      payload: {
        ...eventMeta.payload,
        email_send: { to: emailSend.to, subject: emailSend.subject },
      },
      idempotency_key: eventMeta.idempotency_key ?? null,
    })
    .select()
    .single()

  if (ledgerError) {
    return NextResponse.json({ error: ledgerError.message }, { status: 500 })
  }

  return NextResponse.json(
    { data: { delivery, outbox_item: outboxItem, ledger_event: ledgerEvent } },
    { status: 201 }
  )
}

// GET /api/openclaw/events — recent events
export async function GET(req: NextRequest) {
  if (!authorizeOpenClawRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const limit = parseInt(searchParams.get('limit') || '50')
  const type = searchParams.get('type')
  const automationRunId = searchParams.get('automation_run_id')
  const emailDeliveryId = searchParams.get('email_delivery_id')
  const jobId = searchParams.get('job_id')

  const supabase = supabaseAdmin()
  let query = supabase
    .from('ledger_events')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(limit)

  if (type) {
    query = query.eq('type', type)
  }
  if (automationRunId) {
    query = query.eq('automation_run_id', automationRunId)
  }
  if (emailDeliveryId) {
    query = query.eq('email_delivery_id', emailDeliveryId)
  }
  if (jobId) {
    query = query.eq('job_id', jobId)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}
