import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { createTaskExecutionEvent } from '@/features/task-intake'

export const dynamic = 'force-dynamic'

const INTERNAL_TOKEN = process.env.DELEGATION_INTERNAL_TOKEN

/**
 * POST /api/delegation/callback
 * Called by agent backends to report status changes.
 * Body: { task_id, run_id, status, error?, tokens_in?, tokens_out?, cost_usd? }
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  if (INTERNAL_TOKEN && authHeader !== `Bearer ${INTERNAL_TOKEN}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const {
    task_id,
    run_id,
    status,
    error: errorMsg,
    tokens_in,
    tokens_out,
    cost_usd,
    summary,
    artifacts,
    verification,
    changed_files,
  } = body

  if (!task_id || !status) {
    return NextResponse.json({ error: 'task_id and status required' }, { status: 400 })
  }

  const validStatuses = ['running', 'completed', 'failed', 'cancelled']
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` }, { status: 400 })
  }

  // Map run status to delegation status
  const delegationStatusMap: Record<string, string> = {
    running: 'running',
    completed: 'completed',
    failed: 'failed',
    cancelled: 'cancelled',
  }

  const { data: existingTask } = await supabaseAdmin
    .from('work_items')
    .select('id, workspace_id, project_id, metadata')
    .eq('id', task_id)
    .maybeSingle()

  const metadata = existingTask?.metadata && typeof existingTask.metadata === 'object'
    ? existingTask.metadata as Record<string, unknown>
    : {}

  const updates: Record<string, unknown> = {
    delegation_status: delegationStatusMap[status],
    updated_at: new Date().toISOString(),
  }

  if (status === 'completed') {
    updates.status = 'review'
    updates.metadata = {
      ...metadata,
      execution_state: {
        summary: summary ?? 'Agent marked task complete and sent it to review.',
        latest_event: 'agent_completed',
        changed_files: Array.isArray(changed_files) ? changed_files : [],
        artifacts: Array.isArray(artifacts) ? artifacts : [],
      },
      verification_summary: {
        required: (metadata.verification_summary as Record<string, unknown> | undefined)?.required ?? false,
        latest_status: verification?.status ?? null,
        latest_summary: verification?.summary ?? null,
      },
    }
  }

  // Update work_item delegation status
  await supabaseAdmin
    .from('work_items')
    .update(updates)
    .eq('id', task_id)

  if (existingTask) {
    if (verification && typeof verification === 'object' && typeof verification.status === 'string' && typeof verification.summary === 'string') {
      await supabaseAdmin
        .from('task_verifications')
        .insert({
          work_item_id: task_id,
          workspace_id: existingTask.workspace_id,
          project_id: existingTask.project_id,
          verification_type: typeof verification.type === 'string' ? verification.type : 'manual',
          status: verification.status,
          command: typeof verification.command === 'string' ? verification.command : null,
          summary: verification.summary,
          details: typeof verification.details === 'object' && verification.details !== null ? verification.details : {},
          verified_by: null,
        })
    }

    await createTaskExecutionEvent({
      workItemId: task_id,
      workspaceId: existingTask.workspace_id,
      projectId: existingTask.project_id,
      actorType: 'agent',
      actorId: typeof body.agent_id === 'string' ? body.agent_id : null,
      eventType: `delegation_${status}`,
      summary:
        typeof summary === 'string' && summary.trim().length > 0
          ? summary.trim()
          : `Delegation callback received: ${status}.`,
      details: {
        run_id,
        status,
        error: errorMsg ?? null,
        tokens_in: tokens_in ?? null,
        tokens_out: tokens_out ?? null,
        cost_usd: cost_usd ?? null,
        artifacts: Array.isArray(artifacts) ? artifacts : [],
        verification: verification ?? null,
        changed_files: Array.isArray(changed_files) ? changed_files : [],
      },
    })
  }

  // Update run record if run_id provided
  if (run_id) {
    const runUpdates: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    }
    if (status === 'running' && !body.started_at) {
      runUpdates.started_at = new Date().toISOString()
    }
    if (['completed', 'failed', 'cancelled'].includes(status)) {
      runUpdates.ended_at = new Date().toISOString()
    }
    if (tokens_in != null) runUpdates.tokens_in = tokens_in
    if (tokens_out != null) runUpdates.tokens_out = tokens_out
    if (cost_usd != null) runUpdates.cost_usd = cost_usd

    await supabaseAdmin.from('runs').update(runUpdates).eq('id', run_id)
  }

  // Log to ledger
  await supabaseAdmin.from('ledger_events').insert({
    type: `task.${status}`,
    source: 'delegation_callback',
    context_id: task_id,
    payload: { task_id, run_id, status, error: errorMsg, tokens_in, tokens_out, cost_usd },
    timestamp: new Date().toISOString(),
  })

  return NextResponse.json({ success: true })
}
