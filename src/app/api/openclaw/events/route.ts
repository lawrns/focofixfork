import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { authorizeOpenClawRequest } from '@/lib/security/openclaw-auth'
import { reconcileAutonomySession } from '@/lib/autonomy/session-jobs'
import { finalizeLoopIterationFromSession } from '@/lib/autonomy/loops'
import { mergeRunTrace, readCommandSurfaceTrace } from '@/lib/runs/trace'
import { publishCommandStreamEvent } from '@/lib/command-surface/stream-broker'

export const dynamic = 'force-dynamic'

function inferRunStatus(type: string, payload: Record<string, unknown>): 'pending' | 'running' | 'completed' | 'failed' | null {
  const payloadStatus = typeof payload.status === 'string' ? payload.status.toLowerCase() : ''
  const typeStatus = type.toLowerCase()
  const combined = `${typeStatus} ${payloadStatus}`

  if (combined.includes('completed') || combined.includes('succeeded') || combined.includes('done')) return 'completed'
  if (combined.includes('failed') || combined.includes('error')) return 'failed'
  if (combined.includes('running') || combined.includes('started') || combined.includes('progress')) return 'running'
  if (combined.includes('queued') || combined.includes('accepted') || combined.includes('pending')) return 'pending'
  return null
}

function streamStateFromRunStatus(status: 'pending' | 'running' | 'completed' | 'failed' | null) {
  if (status === 'pending') return 'queued'
  if (status === 'running') return 'live'
  if (status === 'completed') return 'ended'
  if (status === 'failed') return 'error'
  return 'resolving'
}

function eventMessage(payload: Record<string, unknown>): string | null {
  if (typeof payload.summary === 'string' && payload.summary.trim()) return payload.summary.trim()
  if (typeof payload.message === 'string' && payload.message.trim()) return payload.message.trim()
  if (typeof payload.error === 'string' && payload.error.trim()) return payload.error.trim()
  return null
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function threadMessageStatusFromRunStatus(status: 'pending' | 'running' | 'completed' | 'failed' | null) {
  if (status === 'running') return 'running'
  if (status === 'completed') return 'completed'
  if (status === 'failed') return 'failed'
  return 'pending'
}

function outputSummary(payload: Record<string, unknown>): string | null {
  const summary = eventMessage(payload)
  if (summary) return summary
  if (typeof payload.output === 'string' && payload.output.trim()) return payload.output.trim()
  if (payload.output && typeof payload.output === 'object') return JSON.stringify(payload.output)
  return null
}

async function reconcileWorkspaceAgentRun(args: {
  supabase: ReturnType<typeof supabaseAdmin>
  trace: Record<string, unknown>
  nextStatus: 'pending' | 'running' | 'completed' | 'failed' | null
  payload: Record<string, unknown>
  gatewayRunId: string | null
}) {
  const workspaceAgent = asObject(args.trace.workspace_agent)
  if (Object.keys(workspaceAgent).length === 0) return

  const now = new Date().toISOString()
  const message = outputSummary(args.payload)
  const terminal = args.nextStatus === 'completed' || args.nextStatus === 'failed'

  const placeholderMessageId = typeof workspaceAgent.placeholder_message_id === 'string'
    ? workspaceAgent.placeholder_message_id
    : null

  if (placeholderMessageId) {
    const { data: placeholder } = await args.supabase
      .from('agent_thread_messages')
      .select('metadata')
      .eq('id', placeholderMessageId)
      .maybeSingle()

    const existingMetadata = placeholder && typeof placeholder.metadata === 'object' && !Array.isArray(placeholder.metadata)
      ? placeholder.metadata as Record<string, unknown>
      : {}

    await args.supabase
      .from('agent_thread_messages')
      .update({
        status: threadMessageStatusFromRunStatus(args.nextStatus),
        content:
          message ??
          (args.nextStatus === 'running'
            ? 'OpenClaw is working through the request.'
            : args.nextStatus === 'failed'
              ? 'OpenClaw failed to complete the request.'
              : 'OpenClaw completed the request.'),
        metadata: {
          ...existingMetadata,
          last_status: args.nextStatus,
          gateway_run_id: args.gatewayRunId,
          last_event_at: now,
          summary: message,
        },
      })
      .eq('id', placeholderMessageId)

    const threadId = typeof workspaceAgent.thread_id === 'string' ? workspaceAgent.thread_id : null
    if (threadId) {
      await args.supabase
        .from('agent_threads')
        .update({ last_message_at: now })
        .eq('id', threadId)
    }
  }

  const automationRunId = typeof workspaceAgent.automation_run_id === 'string'
    ? workspaceAgent.automation_run_id
    : null
  const automationId = typeof workspaceAgent.automation_id === 'string'
    ? workspaceAgent.automation_id
    : null

  if (automationRunId) {
    await args.supabase
      .from('automation_runs')
      .update({
        status: args.nextStatus ?? 'pending',
        external_run_id: args.gatewayRunId,
        ended_at: terminal ? now : null,
        output: args.nextStatus === 'completed' ? args.payload : {},
        error: args.nextStatus === 'failed' ? (message ?? 'OpenClaw task failed') : null,
        trace: {
          workspace_agent: workspaceAgent,
          openclaw: {
            gateway_run_id: args.gatewayRunId,
            status: args.nextStatus,
            last_event_at: now,
            summary: message,
          },
        },
      })
      .eq('id', automationRunId)
  }

  if (automationId) {
    await args.supabase
      .from('automation_jobs')
      .update({
        last_status: args.nextStatus ?? 'pending',
        last_run_at: now,
      })
      .eq('id', automationId)
  }
}

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
    // Loop-linked autonomy session job fields
    autonomy_session_job_id,
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

  const normalizedPayload = payload && typeof payload === 'object' && !Array.isArray(payload)
    ? payload as Record<string, unknown>
    : {}

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

  // Reconcile autonomy session job if this event is loop-linked
  const TERMINAL_OR_PROGRESS_TYPES = ['running', 'started', 'completed', 'succeeded', 'done', 'failed', 'error', 'cancelled']
  const typeStr = typeof type === 'string' ? type.toLowerCase() : ''
  const isProgressEvent = TERMINAL_OR_PROGRESS_TYPES.some((t) => typeStr.includes(t))

  if (isProgressEvent && (autonomy_session_job_id || correlation_id)) {
    try {
      // Look up the autonomy session job
      let sessionJobRow: { id: string; session_id: string; external_run_id?: string | null } | null = null

      if (autonomy_session_job_id) {
        const { data } = await supabase
          .from('autonomy_session_jobs')
          .select('id, session_id, external_run_id')
          .eq('id', autonomy_session_job_id)
          .maybeSingle()
        sessionJobRow = data ?? null
      }

      if (!sessionJobRow && correlation_id) {
        const { data } = await supabase
          .from('autonomy_session_jobs')
          .select('id, session_id, external_run_id')
          .eq('correlation_id', correlation_id)
          .maybeSingle()
        sessionJobRow = data ?? null
      }

      if (sessionJobRow) {
        // Map gateway state to job status
        let nextJobStatus: 'running' | 'completed' | 'failed' | 'cancelled' | null = null
        if (typeStr.includes('running') || typeStr.includes('started')) {
          nextJobStatus = 'running'
        } else if (typeStr.includes('completed') || typeStr.includes('succeeded') || typeStr.includes('done')) {
          nextJobStatus = 'completed'
        } else if (typeStr.includes('failed') || typeStr.includes('error')) {
          nextJobStatus = 'failed'
        } else if (typeStr.includes('cancelled')) {
          nextJobStatus = 'cancelled'
        }

        const jobPatch: Record<string, unknown> = {}
        if (nextJobStatus) jobPatch.status = nextJobStatus
        // Store external_run_id from run_id if not already set
        if (run_id && !sessionJobRow.external_run_id) {
          jobPatch.external_run_id = run_id
        }

        if (Object.keys(jobPatch).length > 0) {
          await supabase
            .from('autonomy_session_jobs')
            .update(jobPatch)
            .eq('id', sessionJobRow.id)
        }

        // Reconcile the parent session
        const reconciled = await reconcileAutonomySession(supabase, sessionJobRow.session_id)

        // If session reached terminal state, finalize any linked loop iteration
        const TERMINAL_SESSION_STATUSES = ['completed', 'failed', 'cancelled']
        if (TERMINAL_SESSION_STATUSES.includes(reconciled.status)) {
          try {
            await finalizeLoopIterationFromSession(supabase, sessionJobRow.session_id)
          } catch (finalizeErr) {
            // Non-fatal — loop finalization may not be applicable for every session
            console.warn('[openclaw/events] finalizeLoopIterationFromSession failed:', finalizeErr)
          }
        }
      }
    } catch (reconcileErr) {
      // Non-fatal — don't fail the event ingestion if reconciliation errors
      console.warn('[openclaw/events] autonomy session job reconciliation failed:', reconcileErr)
    }
  }

  const appRunId =
    (typeof correlation_id === 'string' && correlation_id.trim().length > 0 ? correlation_id.trim() : null) ??
    (typeof run_id === 'string' && run_id.trim().length > 0 ? run_id.trim() : null)

  if (appRunId) {
    const { data: existingRun } = await supabase
      .from('runs')
      .select('id, trace')
      .eq('id', appRunId)
      .maybeSingle()

    if (existingRun?.id) {
      const nextStatus = inferRunStatus(String(type), normalizedPayload)
      const message = eventMessage(normalizedPayload)
      const commandSurface = readCommandSurfaceTrace(existingRun.trace)
      const now = new Date().toISOString()

      await mergeRunTrace(
        supabase,
        existingRun.id,
        {
          openclaw: {
            correlation_id: typeof correlation_id === 'string' ? correlation_id : existingRun.id,
            gateway_run_id: typeof run_id === 'string' ? run_id : null,
            status: nextStatus,
            model: typeof normalizedPayload.model === 'string' ? normalizedPayload.model : null,
            last_event_at: now,
            ...(message ? { last_summary: message } : {}),
            ...(nextStatus === 'failed' ? { last_error: message ?? 'OpenClaw task failed' } : {}),
          },
          command_surface: {
            ...(commandSurface.job_id ? { job_id: commandSurface.job_id } : {}),
            stream_state: streamStateFromRunStatus(nextStatus),
            last_stream_event_at: now,
            ...(message ? { last_summary: message } : {}),
            ...(nextStatus === 'failed' ? { last_error: message ?? 'OpenClaw task failed' } : {}),
          },
        },
        {
          ...(nextStatus ? { status: nextStatus } : {}),
          ...(message ? { summary: message } : {}),
        },
      )

      await reconcileWorkspaceAgentRun({
        supabase,
        trace: asObject(existingRun.trace),
        nextStatus,
        payload: normalizedPayload,
        gatewayRunId: typeof run_id === 'string' ? run_id : null,
      })

      if (commandSurface.job_id) {
        if (nextStatus === 'pending' || nextStatus === 'running') {
          publishCommandStreamEvent(commandSurface.job_id, {
            type: 'status_update',
            status: nextStatus === 'pending' ? 'queued' : 'executing',
            message: message ?? (nextStatus === 'pending' ? 'Queued in OpenClaw' : 'Running in OpenClaw'),
            timestamp: now,
          })
          if (message && nextStatus === 'running') {
            publishCommandStreamEvent(commandSurface.job_id, {
              type: 'reasoning',
              text: message,
              timestamp: now,
            })
          }
        } else if (nextStatus === 'completed') {
          publishCommandStreamEvent(commandSurface.job_id, {
            type: 'status_update',
            status: 'completed',
            message: message ?? 'OpenClaw task completed',
            timestamp: now,
          })
          publishCommandStreamEvent(commandSurface.job_id, {
            type: 'done',
            exitCode: 0,
            summary: message ?? 'OpenClaw task completed',
            timestamp: now,
          })
        } else if (nextStatus === 'failed') {
          publishCommandStreamEvent(commandSurface.job_id, {
            type: 'error',
            message: message ?? 'OpenClaw task failed',
            timestamp: now,
          })
          publishCommandStreamEvent(commandSurface.job_id, {
            type: 'done',
            exitCode: 1,
            summary: message ?? 'OpenClaw task failed',
            timestamp: now,
          })
        }
      }
    }
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
      payload: normalizedPayload,
      idempotency_key: idempotencyKey,
    })
    .select()
    .single()

  if (ledgerError) {
    return NextResponse.json({ error: ledgerError.message }, { status: 500 })
  }

  // Optionally update run status
  if (run_id && normalizedPayload?.status) {
    await supabase
      .from('runs')
      .update({ status: normalizedPayload.status, summary: normalizedPayload.summary ?? null })
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
