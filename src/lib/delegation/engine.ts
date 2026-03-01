/**
 * Delegation Engine — core tick that processes pending work items.
 *
 * Mode behavior:
 *   Reactive  → skip all (no auto-dispatch)
 *   Predictive → dispatch only if approval_required=false (or already approved)
 *   Guarded   → dispatch autonomously within policy bounds
 */

import { supabaseAdmin } from '@/lib/supabase-server'
import { matchAgent } from './agent-matcher'
import { loadHandbook, listHandbooks } from './handbook-loader'
import { dispatchToClawdBot, buildSystemPrompt, type DispatchPayload } from './dispatchers'

export interface DelegationTickResult {
  processed: number
  delegated: string[]
  skipped: string[]
  errors: Array<{ taskId: string; error: string }>
}

async function getCurrentMode(): Promise<'Reactive' | 'Predictive' | 'Guarded'> {
  const { data } = await supabaseAdmin
    .from('ledger_events')
    .select('payload')
    .eq('type', 'mode_change')
    .order('timestamp', { ascending: false })
    .limit(1)
    .maybeSingle()

  return (data?.payload as any)?.mode ?? 'Reactive'
}

export async function processDelegationTick(): Promise<DelegationTickResult> {
  const result: DelegationTickResult = {
    processed: 0,
    delegated: [],
    skipped: [],
    errors: [],
  }

  // 1. Check current mode
  const mode = await getCurrentMode()
  if (mode === 'Reactive') {
    // No auto-dispatch in Reactive mode
    return result
  }

  // 2. Fetch pending work items from projects that have delegation enabled
  const { data: items, error: itemsError } = await supabaseAdmin
    .from('work_items')
    .select(`
      id, title, description, priority, created_at, approval_required, approved_by, handbook_ref,
      foco_projects!project_id (
        id, name, slug, assigned_agent_pool, delegation_settings
      )
    `)
    .eq('delegation_status', 'pending')
    .limit(10)
    .order('created_at', { ascending: true })

  if (itemsError || !items) {
    return result
  }

  result.processed = items.length

  for (const item of items) {
    const project = (item as any).foco_projects
    if (!project) {
      result.skipped.push(item.id)
      continue
    }

    // Check if delegation is enabled for this project
    const delegationSettings = project.delegation_settings as Record<string, unknown> | null
    if (!delegationSettings?.enabled) {
      result.skipped.push(item.id)
      continue
    }

    // Predictive mode: skip if approval_required and not yet approved
    if (mode === 'Predictive' && item.approval_required && !item.approved_by) {
      result.skipped.push(item.id)
      continue
    }

    // 3. Match an idle agent from the pool
    const agentPool: string[] = Array.isArray(project.assigned_agent_pool)
      ? project.assigned_agent_pool
      : []
    const agentId = await matchAgent(agentPool)

    if (!agentId) {
      result.skipped.push(item.id)
      continue
    }

    // 4. Load handbooks
    const projectContext = await loadHandbook(project.slug)
    const featureContext = item.handbook_ref ? await loadHandbook(item.handbook_ref) : ''

    // 5. Build system prompt
    const systemPrompt = buildSystemPrompt(
      project.name,
      projectContext,
      featureContext,
      item.title,
      item.description
    )

    // 6. Optimistic lock: update delegation_status to 'delegated' BEFORE dispatching
    const { error: lockError } = await supabaseAdmin
      .from('work_items')
      .update({ delegation_status: 'delegated', updated_at: new Date().toISOString() })
      .eq('id', item.id)
      .eq('delegation_status', 'pending') // only if still pending

    if (lockError) {
      // Another process got to it first — skip
      result.skipped.push(item.id)
      continue
    }

    // 7. Create a run record
    const { data: run, error: runError } = await supabaseAdmin
      .from('runs')
      .insert({
        runner: agentId,
        task_id: item.id,
        status: 'pending',
        summary: `Delegated: ${item.title}`,
      })
      .select()
      .single()

    if (runError || !run) {
      // Roll back the lock
      await supabaseAdmin
        .from('work_items')
        .update({ delegation_status: 'pending' })
        .eq('id', item.id)
      result.errors.push({ taskId: item.id, error: 'Failed to create run record' })
      continue
    }

    // 8. Dispatch to ClawdBot
    const payload: DispatchPayload = {
      taskId: item.id,
      title: item.title,
      description: item.description,
      projectContext,
      featureContext,
      systemPrompt,
      agentId,
    }

    const dispatchResult = await dispatchToClawdBot(payload)

    if (!dispatchResult.success) {
      // Roll back
      await supabaseAdmin.from('runs').delete().eq('id', run.id)
      await supabaseAdmin
        .from('work_items')
        .update({ delegation_status: 'pending', updated_at: new Date().toISOString() })
        .eq('id', item.id)
      result.errors.push({ taskId: item.id, error: dispatchResult.error ?? 'Dispatch failed' })
      continue
    }

    // 9. Update work item with run_id and assigned_agent; capture any synchronous usage data
    await supabaseAdmin
      .from('work_items')
      .update({
        run_id: run.id,
        assigned_agent: agentId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', item.id)

    if (dispatchResult.tokensIn != null || dispatchResult.costUsd != null) {
      await supabaseAdmin.from('runs').update({
        tokens_in: dispatchResult.tokensIn,
        tokens_out: dispatchResult.tokensOut,
        cost_usd: dispatchResult.costUsd,
      }).eq('id', run.id)
    }

    // 10. Log to ledger
    await supabaseAdmin.from('ledger_events').insert({
      type: 'task.delegated',
      source: 'delegation_engine',
      context_id: item.id,
      payload: {
        task_id: item.id,
        run_id: run.id,
        agent_id: agentId,
        mode,
        handbook_ref: item.handbook_ref,
      },
      timestamp: new Date().toISOString(),
    })

    result.delegated.push(item.id)
  }

  return result
}
