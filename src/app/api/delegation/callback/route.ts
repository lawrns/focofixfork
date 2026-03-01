import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

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
  const { task_id, run_id, status, error: errorMsg, tokens_in, tokens_out, cost_usd } = body

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

  const updates: Record<string, unknown> = {
    delegation_status: delegationStatusMap[status],
    updated_at: new Date().toISOString(),
  }

  // Update work_item delegation status
  await supabaseAdmin
    .from('work_items')
    .update(updates)
    .eq('id', task_id)

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
