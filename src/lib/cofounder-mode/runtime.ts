import type { SupabaseClient } from '@supabase/supabase-js'
import { DEFAULT_COFOUNDER_MODE_CONFIG, parseCoFounderModeConfig } from '@/lib/cofounder-mode/parse'
import { evaluateInitiativeHealth } from '@/lib/cofounder-mode/initiatives'
import { aggregateLearningMetrics } from '@/lib/cofounder-mode/learning'
import { synthesizeRiskSnapshot } from '@/lib/cofounder-mode/risk'
import { rankScanCandidates } from '@/lib/cofounder-mode/scanning'
import type {
  CoFounderInitiativeRecord,
  CoFounderLearningEvent,
  CoFounderModeConfigV1,
} from '@/lib/cofounder-mode/types'

interface ScopeConfigRow {
  user_id: string
  workspace_id: string | null
  config: Record<string, unknown> | null
  created_at: string
}

interface DecisionAuditRow {
  id: string
  user_id: string
  workspace_id: string | null
  action_type: string
  domain: string
  result: Record<string, unknown>
  created_at: string
}

interface RuntimeStateRow {
  user_id: string
  workspace_id: string | null
  trust_score: number
  autonomy_mode: string
  state: Record<string, unknown>
  updated_at: string
}

function scopeKey(userId: string, workspaceId: string | null): string {
  return `${userId}::${workspaceId ?? 'global'}`
}

function redactPayload(payload: unknown, redactFields: string[]): unknown {
  if (Array.isArray(payload)) {
    return payload.map((value) => redactPayload(value, redactFields))
  }

  if (payload && typeof payload === 'object') {
    const row = payload as Record<string, unknown>
    const out: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(row)) {
      if (redactFields.some((field) => key.toLowerCase().includes(field.toLowerCase()))) {
        out[key] = '[REDACTED]'
      } else {
        out[key] = redactPayload(value, redactFields)
      }
    }
    return out
  }

  return payload
}

export async function appendCofounderHistoryEvent(
  supabase: SupabaseClient,
  input: {
    userId: string
    workspaceId?: string | null
    eventType: string
    severity?: string
    title: string
    detail?: string | null
    payload?: Record<string, unknown>
  }
): Promise<void> {
  await supabase.from('cofounder_decisions_history').insert({
    user_id: input.userId,
    workspace_id: input.workspaceId ?? null,
    event_type: input.eventType,
    severity: input.severity ?? 'info',
    title: input.title,
    detail: input.detail ?? null,
    payload: input.payload ?? {},
  })
}

export async function recordCofounderErrorAudit(
  supabase: SupabaseClient,
  input: {
    userId: string
    workspaceId?: string | null
    errorCode: string
    message: string
    context?: Record<string, unknown>
    payload?: Record<string, unknown>
  }
): Promise<void> {
  await supabase.from('cofounder_error_audit').insert({
    user_id: input.userId,
    workspace_id: input.workspaceId ?? null,
    error_code: input.errorCode,
    message: input.message,
    context: input.context ?? {},
    payload: input.payload ?? {},
  })
}

export async function resolveLatestScopeConfigs(supabase: SupabaseClient): Promise<ScopeConfigRow[]> {
  const { data } = await supabase
    .from('cofounder_mode_configs')
    .select('user_id, workspace_id, config, created_at')
    .order('created_at', { ascending: false })
    .limit(500)
    .returns<ScopeConfigRow[]>()

  const byScope = new Map<string, ScopeConfigRow>()

  for (const row of data ?? []) {
    const key = scopeKey(row.user_id, row.workspace_id)
    if (!byScope.has(key)) {
      byScope.set(key, row)
    }
  }

  return [...byScope.values()]
}

function parseConfig(row: ScopeConfigRow): CoFounderModeConfigV1 {
  const parsed = parseCoFounderModeConfig(row.config ?? {})
  return parsed.config
}

export async function runProactiveScanForScope(
  supabase: SupabaseClient,
  row: ScopeConfigRow
): Promise<{ inserted: number; skipped: boolean; reason?: string }> {
  const config = parseConfig(row)

  if (process.env.COFOUNDER_PROACTIVE_SCANNING_ENABLED === 'false') {
    return { inserted: 0, skipped: true, reason: 'flag_disabled' }
  }

  if (!config.proactiveScanning.enabled) {
    return { inserted: 0, skipped: true, reason: 'config_disabled' }
  }

  const since = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000)).toISOString()
  let query = supabase
    .from('cofounder_decision_audit')
    .select('id, action_type, domain, result, created_at')
    .eq('user_id', row.user_id)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(100)

  if (row.workspace_id) {
    query = query.eq('workspace_id', row.workspace_id)
  }

  const { data: decisions } = await query.returns<Array<{
    id: string
    action_type: string
    domain: string
    result: Record<string, unknown>
    created_at: string
  }>>()

  const candidates = (decisions ?? []).slice(0, 20).map((decision) => {
    const decisionResult = decision.result as Record<string, unknown>
    const requiresApproval = Boolean(decisionResult.requiresApproval)
    const allowed = Boolean(decisionResult.allowed)

    return {
      id: decision.id,
      title: `${decision.action_type} in ${decision.domain}`,
      impact: allowed ? 0.7 : 0.5,
      confidence: typeof decisionResult.meta === 'object' && decisionResult.meta
        ? Number((decisionResult.meta as Record<string, unknown>).weightedConfidence ?? 0.5)
        : 0.5,
      effort: requiresApproval ? 0.7 : 0.3,
      urgency: requiresApproval ? 0.8 : 0.5,
    }
  })

  const ranked = rankScanCandidates(candidates, config).slice(0, 5)
  if (ranked.length === 0) {
    return { inserted: 0, skipped: true, reason: 'no_candidates' }
  }

  const now = new Date().toISOString()
  const payloads = ranked.map((candidate) => ({
    user_id: row.user_id,
    workspace_id: row.workspace_id,
    event_type: 'proactive_scan_candidate',
    severity: candidate.score >= 0.8 ? 'warning' : 'info',
    title: `Opportunity: ${candidate.title}`,
    detail: `Rank score ${candidate.score.toFixed(2)}`,
    payload: {
      candidate,
      cadence: config.proactiveScanning.cadences,
    },
    created_at: now,
  }))

  await supabase.from('cofounder_decisions_history').insert(payloads)

  const blocked = (decisions ?? []).filter((d) => {
    const decisionResult = d.result as Record<string, unknown>
    return decisionResult.allowed === false
  }).length

  const riskSnapshot = synthesizeRiskSnapshot(config, {
    technical: Math.min(1, blocked / Math.max(1, (decisions ?? []).length)),
    market: 0.35,
    financial: 0.3,
    legal: 0.2,
  })

  await supabase.from('cofounder_risk_snapshots').insert({
    user_id: row.user_id,
    workspace_id: row.workspace_id,
    technical: riskSnapshot.domainScores.technical,
    market: riskSnapshot.domainScores.market,
    financial: riskSnapshot.domainScores.financial,
    legal: riskSnapshot.domainScores.legal,
    unified_score: riskSnapshot.unifiedScore,
    risk_level: riskSnapshot.level,
  })

  await appendCofounderHistoryEvent(supabase, {
    userId: row.user_id,
    workspaceId: row.workspace_id,
    eventType: 'risk_snapshot',
    severity: riskSnapshot.level === 'critical' ? 'warning' : 'info',
    title: `Risk moved to ${riskSnapshot.level}`,
    detail: `Unified score ${riskSnapshot.unifiedScore.toFixed(2)}`,
    payload: riskSnapshot as unknown as Record<string, unknown>,
  })

  return { inserted: ranked.length, skipped: false }
}

export async function runInitiativeCheckpointForScope(
  supabase: SupabaseClient,
  row: ScopeConfigRow
): Promise<{ total: number; stale: number; skipped: boolean; reason?: string }> {
  const config = parseConfig(row)

  if (!config.initiatives.enabled) {
    return { total: 0, stale: 0, skipped: true, reason: 'config_disabled' }
  }

  let query = supabase
    .from('cofounder_initiatives')
    .select('id, title, lane, status, updated_at')
    .eq('user_id', row.user_id)
    .eq('status', 'active')
    .limit(200)

  if (row.workspace_id) {
    query = query.eq('workspace_id', row.workspace_id)
  }

  const { data } = await query.returns<CoFounderInitiativeRecord[]>()
  const health = evaluateInitiativeHealth(data ?? [], config)
  const stale = health.filter((item) => item.stale)

  if (health.length > 0) {
    await supabase.from('cofounder_initiative_checkpoints').insert(
      health.map((item) => ({
        initiative_id: item.id,
        user_id: row.user_id,
        workspace_id: row.workspace_id,
        health: item.stale ? 'stale' : 'ok',
        notes: item.stale ? `Idle for ${Math.round(item.idleHours)}h` : 'Healthy',
        payload: item,
      }))
    )
  }

  if (stale.length > 0) {
    await appendCofounderHistoryEvent(supabase, {
      userId: row.user_id,
      workspaceId: row.workspace_id,
      eventType: 'initiative_stale',
      severity: 'warning',
      title: `${stale.length} initiative(s) stale`,
      detail: stale.map((item) => item.title).join(', ').slice(0, 500),
      payload: { stale },
    })
  }

  return {
    total: health.length,
    stale: stale.length,
    skipped: false,
  }
}

export async function runLearningRollupForScope(
  supabase: SupabaseClient,
  row: ScopeConfigRow
): Promise<{ totalDecisions: number; skipped: boolean; reason?: string }> {
  const config = parseConfig(row)
  if (!config.learningRoi.enabled) {
    return { totalDecisions: 0, skipped: true, reason: 'config_disabled' }
  }

  const now = new Date()
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))

  let query = supabase
    .from('cofounder_decision_audit')
    .select('id, user_id, workspace_id, action_type, domain, result, created_at')
    .eq('user_id', row.user_id)
    .gte('created_at', monthStart.toISOString())
    .limit(500)

  if (row.workspace_id) {
    query = query.eq('workspace_id', row.workspace_id)
  }

  const { data } = await query.returns<DecisionAuditRow[]>()

  const events: CoFounderLearningEvent[] = (data ?? []).map((decision) => {
    const result = decision.result as Record<string, unknown>
    const meta = (result.meta as Record<string, unknown> | undefined) ?? {}
    const weightedConfidence = Number(meta.weightedConfidence ?? 0.5)

    return {
      accepted: Boolean(result.allowed) && !Boolean(result.requiresApproval),
      predictedCorrect: weightedConfidence >= 0.5,
      estimatedMinutesSaved: Boolean(result.allowed) ? 20 : 5,
      cycleHours: Boolean(result.requiresApproval) ? 8 : 2,
    }
  })

  const rollup = aggregateLearningMetrics(events)

  await supabase.from('cofounder_learning_metrics_monthly').upsert({
    user_id: row.user_id,
    workspace_id: row.workspace_id,
    month_start: monthStart.toISOString().slice(0, 10),
    acceptance_rate: rollup.acceptanceRate,
    prediction_accuracy: rollup.predictionAccuracy,
    average_minutes_saved: rollup.averageMinutesSaved,
    decision_velocity_hours: rollup.decisionVelocityHours,
    total_decisions: rollup.totalDecisions,
    payload: rollup,
  }, {
    onConflict: 'user_id,workspace_id,month_start',
  })

  await appendCofounderHistoryEvent(supabase, {
    userId: row.user_id,
    workspaceId: row.workspace_id,
    eventType: 'learning_rollup',
    severity: 'info',
    title: `Learning rollup (${monthStart.toISOString().slice(0, 7)})`,
    detail: `${rollup.totalDecisions} decisions, acceptance ${Math.round(rollup.acceptanceRate * 100)}%`,
    payload: rollup as unknown as Record<string, unknown>,
  })

  return {
    totalDecisions: rollup.totalDecisions,
    skipped: false,
  }
}

export async function buildAuditArtifactsForScope(
  supabase: SupabaseClient,
  scope: { userId: string; workspaceId?: string | null },
  options?: { persist?: boolean }
) {
  const scopeWorkspaceId = scope.workspaceId ?? null

  let configQuery = supabase
    .from('cofounder_mode_configs')
    .select('config, created_at')
    .eq('user_id', scope.userId)
    .order('created_at', { ascending: false })
    .limit(1)

  if (scopeWorkspaceId) {
    configQuery = configQuery.eq('workspace_id', scopeWorkspaceId)
  } else {
    configQuery = configQuery.is('workspace_id', null)
  }

  let decisionsQuery = supabase
    .from('cofounder_decision_audit')
    .select('id, action_type, domain, input, result, confidence, divergence, resolution, created_at')
    .eq('user_id', scope.userId)
    .order('created_at', { ascending: false })
    .limit(300)

  let errorsQuery = supabase
    .from('cofounder_error_audit')
    .select('id, error_code, message, context, payload, created_at')
    .eq('user_id', scope.userId)
    .order('created_at', { ascending: false })
    .limit(300)

  let historyQuery = supabase
    .from('cofounder_decisions_history')
    .select('id, event_type, severity, title, detail, payload, created_at')
    .eq('user_id', scope.userId)
    .order('created_at', { ascending: false })
    .limit(500)

  let runtimeStateQuery = supabase
    .from('cofounder_runtime_state')
    .select('user_id, workspace_id, trust_score, autonomy_mode, state, updated_at')
    .eq('user_id', scope.userId)
    .order('updated_at', { ascending: false })
    .limit(1)

  if (scopeWorkspaceId) {
    decisionsQuery = decisionsQuery.eq('workspace_id', scopeWorkspaceId)
    errorsQuery = errorsQuery.eq('workspace_id', scopeWorkspaceId)
    historyQuery = historyQuery.eq('workspace_id', scopeWorkspaceId)
    runtimeStateQuery = runtimeStateQuery.eq('workspace_id', scopeWorkspaceId)
  } else {
    decisionsQuery = decisionsQuery.is('workspace_id', null)
    errorsQuery = errorsQuery.is('workspace_id', null)
    historyQuery = historyQuery.is('workspace_id', null)
    runtimeStateQuery = runtimeStateQuery.is('workspace_id', null)
  }

  const [{ data: configRows }, { data: decisions }, { data: errors }, { data: history }, { data: runtimeState }] = await Promise.all([
    configQuery,
    decisionsQuery,
    errorsQuery,
    historyQuery,
    runtimeStateQuery.maybeSingle<RuntimeStateRow>(),
  ])

  const config = parseCoFounderModeConfig(configRows?.[0]?.config ?? DEFAULT_COFOUNDER_MODE_CONFIG).config

  const decisionAudit = {
    schema: 'decision-audit.json',
    generatedAt: new Date().toISOString(),
    entries: (decisions ?? []).map((row: Record<string, unknown>) => redactPayload(row, config.auditArtifacts.redactFields)),
  }

  const errorAudit = {
    schema: 'error-audit.json',
    generatedAt: new Date().toISOString(),
    entries: (errors ?? []).map((row: Record<string, unknown>) => redactPayload(row, config.auditArtifacts.redactFields)),
  }

  const decisionsHistory = {
    schema: 'decisions-history.json',
    generatedAt: new Date().toISOString(),
    entries: (history ?? []).map((row: Record<string, unknown>) => redactPayload(row, config.auditArtifacts.redactFields)),
  }

  const runtimeStateArtifact = {
    schema: 'runtime-state.json',
    generatedAt: new Date().toISOString(),
    state: redactPayload(runtimeState ?? null, config.auditArtifacts.redactFields),
  }

  if (options?.persist) {
    const now = new Date().toISOString()
    await supabase.from('cofounder_artifact_state').insert([
      {
        user_id: scope.userId,
        workspace_id: scopeWorkspaceId,
        artifact_type: 'decision-audit.json',
        content: decisionAudit,
        created_at: now,
      },
      {
        user_id: scope.userId,
        workspace_id: scopeWorkspaceId,
        artifact_type: 'error-audit.json',
        content: errorAudit,
        created_at: now,
      },
      {
        user_id: scope.userId,
        workspace_id: scopeWorkspaceId,
        artifact_type: 'decisions-history.json',
        content: decisionsHistory,
        created_at: now,
      },
      {
        user_id: scope.userId,
        workspace_id: scopeWorkspaceId,
        artifact_type: 'runtime-state.json',
        content: runtimeStateArtifact,
        created_at: now,
      },
    ])
  }

  return {
    configVersion: config.version,
    decisionAudit,
    errorAudit,
    decisionsHistory,
    runtimeState: runtimeStateArtifact,
  }
}
