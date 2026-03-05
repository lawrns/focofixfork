import type { SupabaseClient } from '@supabase/supabase-js'

export type PivotalResolutionDecision = 'approve' | 'reject' | 'defer' | 'resolved'

interface PivotalQueueRow {
  id: string
  user_id: string
  workspace_id: string | null
  question: string
  context: Record<string, unknown> | null
  status: string
  delivery_state: string
}

interface PivotalQueueUpdateRow {
  id: string
  status: string
  delivery_state: string
  resolution: string | null
  resolved_at: string | null
  updated_at: string
}

export interface ResolvePivotalInput {
  pivotalId: string
  decision: PivotalResolutionDecision
  resolverChannel: 'app' | 'telegram' | 'clawdbot'
  resolverUserId?: string | null
  expectedOwnerUserId?: string
  resolverMeta?: Record<string, unknown>
  deferMinutes?: number
}

export interface ResolvePivotalResult {
  ok: boolean
  code?: 'not_found' | 'forbidden' | 'invalid_state' | 'database_error'
  message?: string
  item?: PivotalQueueUpdateRow
  ownerUserId?: string
  workspaceId?: string | null
}

function buildResolutionSummary(input: ResolvePivotalInput, nowIso: string): Record<string, unknown> {
  return {
    decision: input.decision,
    channel: input.resolverChannel,
    resolvedAt: nowIso,
    ...(input.resolverMeta ? { meta: input.resolverMeta } : {}),
  }
}

function mapEventInfo(decision: PivotalResolutionDecision): {
  eventType: string
  severity: 'info' | 'warning'
  titleSuffix: string
} {
  switch (decision) {
    case 'approve':
      return { eventType: 'pivotal_approved', severity: 'info', titleSuffix: 'approved' }
    case 'reject':
      return { eventType: 'pivotal_rejected', severity: 'warning', titleSuffix: 'rejected' }
    case 'defer':
      return { eventType: 'pivotal_deferred', severity: 'info', titleSuffix: 'deferred' }
    default:
      return { eventType: 'pivotal_resolved', severity: 'info', titleSuffix: 'resolved' }
  }
}

function ledgerSourceForChannel(channel: ResolvePivotalInput['resolverChannel']): string {
  if (channel === 'telegram') return 'telegram'
  if (channel === 'clawdbot') return 'clawdbot'
  return 'cofounder'
}

export async function resolvePivotalQuestion(
  supabase: SupabaseClient,
  input: ResolvePivotalInput
): Promise<ResolvePivotalResult> {
  const { data: current, error: currentError } = await supabase
    .from('cofounder_pivotal_queue')
    .select('id, user_id, workspace_id, question, context, status, delivery_state')
    .eq('id', input.pivotalId)
    .maybeSingle<PivotalQueueRow>()

  if (currentError) {
    return {
      ok: false,
      code: 'database_error',
      message: currentError.message,
    }
  }

  if (!current) {
    return {
      ok: false,
      code: 'not_found',
      message: 'Pivotal question not found',
    }
  }

  if (input.expectedOwnerUserId && current.user_id !== input.expectedOwnerUserId) {
    return {
      ok: false,
      code: 'forbidden',
      message: 'Pivotal question does not belong to the current user',
    }
  }

  if (current.status === 'suppressed') {
    return {
      ok: false,
      code: 'invalid_state',
      message: 'Suppressed pivotal questions cannot be resolved',
    }
  }

  const nowIso = new Date().toISOString()
  const deferMinutes = Math.max(1, Math.floor(input.deferMinutes ?? 30))
  const nextEligibleAt = new Date(Date.now() + (deferMinutes * 60 * 1000)).toISOString()

  const context = current.context && typeof current.context === 'object'
    ? current.context
    : {}

  const updatePayload: Record<string, unknown> = {
    context: {
      ...context,
      latestResolution: buildResolutionSummary(input, nowIso),
    },
  }

  if (input.decision === 'defer') {
    updatePayload.status = 'queued'
    updatePayload.delivery_state = 'queued'
    updatePayload.resolution = 'deferred'
    updatePayload.resolved_by = null
    updatePayload.resolved_at = null
    updatePayload.next_eligible_at = nextEligibleAt
  } else {
    updatePayload.status = 'resolved'
    updatePayload.delivery_state = 'resolved'
    updatePayload.resolution = input.decision
    updatePayload.resolved_by = input.resolverUserId ?? current.user_id
    updatePayload.resolved_at = nowIso
    updatePayload.next_eligible_at = null
  }

  const { data: updated, error: updateError } = await supabase
    .from('cofounder_pivotal_queue')
    .update(updatePayload)
    .eq('id', current.id)
    .select('id, status, delivery_state, resolution, resolved_at, updated_at')
    .single<PivotalQueueUpdateRow>()

  if (updateError) {
    return {
      ok: false,
      code: 'database_error',
      message: updateError.message,
    }
  }

  const eventInfo = mapEventInfo(input.decision)
  const detail = input.decision === 'defer'
    ? `Deferred for ${deferMinutes} minute(s)`
    : `Resolved via ${input.resolverChannel}`

  const payload = {
    pivotalId: current.id,
    question: current.question,
    decision: input.decision,
    resolverChannel: input.resolverChannel,
    resolverMeta: input.resolverMeta ?? {},
  }

  await supabase.from('cofounder_decisions_history').insert({
    user_id: current.user_id,
    workspace_id: current.workspace_id,
    event_type: eventInfo.eventType,
    severity: eventInfo.severity,
    title: `Pivotal ${current.id} ${eventInfo.titleSuffix}`,
    detail,
    payload,
  })

  await supabase.from('ledger_events').insert({
    type: eventInfo.eventType,
    source: ledgerSourceForChannel(input.resolverChannel),
    context_id: current.id,
    workspace_id: current.workspace_id,
    user_id: current.user_id,
    payload,
  })

  return {
    ok: true,
    item: updated,
    ownerUserId: current.user_id,
    workspaceId: current.workspace_id,
  }
}
