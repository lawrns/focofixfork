import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  Agent,
  AgentTrustScore,
  AgentPoeAnchor,
  AgentReputationProfile,
  AutonomyTier,
  PoeOutcome,
  AgentBackend,
  AutonomyGraduationLogEntry,
} from './types'

async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(input)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export class TrustScoringService {
  /**
   * Find or create an agents row from backend + key.
   */
  static async resolveAgent(
    supabase: SupabaseClient,
    opts: { workspaceId: string; backend: AgentBackend; agentKey: string; displayName?: string },
  ): Promise<Agent> {
    const { data: existing } = await supabase
      .from('agents')
      .select('*')
      .eq('workspace_id', opts.workspaceId)
      .eq('backend', opts.backend)
      .eq('agent_key', opts.agentKey)
      .single()

    if (existing) return existing as Agent

    const displayName = opts.displayName || opts.agentKey
    const { data: created, error } = await supabase
      .from('agents')
      .insert({
        workspace_id: opts.workspaceId,
        backend: opts.backend,
        agent_key: opts.agentKey,
        display_name: displayName,
        slug: slugify(displayName),
      })
      .select('*')
      .single()

    if (error) throw new Error(`[TrustScoring] resolveAgent failed: ${error.message}`)
    return created as Agent
  }

  /**
   * Get trust score row, create with score=50 if missing.
   */
  static async getOrCreateScore(
    supabase: SupabaseClient,
    agentId: string,
    workspaceId: string,
  ): Promise<AgentTrustScore> {
    const { data: existing } = await supabase
      .from('agent_trust_scores')
      .select('*')
      .eq('agent_id', agentId)
      .eq('workspace_id', workspaceId)
      .single()

    if (existing) return existing as AgentTrustScore

    const { data: created, error } = await supabase
      .from('agent_trust_scores')
      .insert({
        agent_id: agentId,
        workspace_id: workspaceId,
        score: 50.0,
      })
      .select('*')
      .single()

    if (error) throw new Error(`[TrustScoring] getOrCreateScore failed: ${error.message}`)
    return created as AgentTrustScore
  }

  /**
   * Main entry point: create PoE anchor + update score + check graduation.
   */
  static async recordIteration(
    supabase: SupabaseClient,
    opts: {
      agentId: string
      agentKey: string
      backend: string
      workspaceId: string
      sessionId: string
      runId: string | null
      outcome: PoeOutcome
      durationMs: number | null
      metadata: Record<string, unknown>
    },
  ): Promise<{ anchor: AgentPoeAnchor; score: AgentTrustScore }> {
    // Resolve or create the agent
    const agent = await TrustScoringService.resolveAgent(supabase, {
      workspaceId: opts.workspaceId,
      backend: opts.backend as AgentBackend,
      agentKey: opts.agentKey,
      displayName: opts.agentKey,
    })

    // Create PoE anchor with ledger hash chain link
    const anchor = await TrustScoringService.createPoeAnchor(supabase, {
      agentId: agent.id,
      workspaceId: opts.workspaceId,
      sessionId: opts.sessionId,
      runId: opts.runId,
      outcome: opts.outcome,
      durationMs: opts.durationMs,
      metadata: opts.metadata,
    })

    // Recalculate score
    const score = await TrustScoringService.recalculateScore(supabase, agent.id, opts.workspaceId)

    // Update the anchor with score info
    const scoreDelta = score.score - (anchor.score_after ?? 50)
    await supabase
      .from('agent_poe_anchors')
      .update({ score_delta: scoreDelta, score_after: score.score })
      .eq('id', anchor.id)

    // Check graduation eligibility
    await TrustScoringService.evaluateGraduation(supabase, agent.id, opts.workspaceId)

    return { anchor: { ...anchor, score_delta: scoreDelta, score_after: score.score }, score }
  }

  /**
   * Insert PoE anchor + write ledger_events row with hash chain link.
   */
  static async createPoeAnchor(
    supabase: SupabaseClient,
    opts: {
      agentId: string
      workspaceId: string
      sessionId: string
      runId: string | null
      outcome: PoeOutcome
      durationMs: number | null
      metadata: Record<string, unknown>
    },
  ): Promise<AgentPoeAnchor> {
    // 1. Fetch latest ledger_events hash for chain link
    const { data: latestLedger } = await supabase
      .from('ledger_events')
      .select('hash')
      .order('timestamp', { ascending: false })
      .limit(1)
      .single()

    const prevHash = latestLedger?.hash ?? null

    // 2. Compute new hash
    const payload = {
      agent_id: opts.agentId,
      session_id: opts.sessionId,
      run_id: opts.runId,
      outcome: opts.outcome,
      duration_ms: opts.durationMs,
      timestamp: new Date().toISOString(),
    }
    const hashInput = (prevHash ?? '') + JSON.stringify(payload)
    const newHash = await sha256(hashInput)

    // 3. Insert ledger_events row
    const { data: ledgerEvent, error: ledgerError } = await supabase
      .from('ledger_events')
      .insert({
        type: 'agent.poe_anchor',
        source: 'trust_scoring_service',
        context_id: opts.sessionId,
        workspace_id: opts.workspaceId,
        payload,
        prev_hash: prevHash,
        hash: newHash,
      })
      .select('id')
      .single()

    if (ledgerError) {
      console.error('[TrustScoring] ledger insert failed:', ledgerError.message)
    }

    // 4. Compute input/output hashes for payload integrity
    const inputHash = await sha256(JSON.stringify({ session_id: opts.sessionId, agent_id: opts.agentId }))
    const outputHash = await sha256(JSON.stringify({ outcome: opts.outcome, metadata: opts.metadata }))

    // 5. Insert PoE anchor
    const { data: anchor, error: anchorError } = await supabase
      .from('agent_poe_anchors')
      .insert({
        agent_id: opts.agentId,
        workspace_id: opts.workspaceId,
        session_id: opts.sessionId,
        run_id: opts.runId,
        ledger_event_id: ledgerEvent?.id ?? null,
        ledger_hash: newHash,
        outcome: opts.outcome,
        input_hash: inputHash,
        output_hash: outputHash,
        duration_ms: opts.durationMs,
        metadata: opts.metadata,
      })
      .select('*')
      .single()

    if (anchorError) throw new Error(`[TrustScoring] createPoeAnchor failed: ${anchorError.message}`)
    return anchor as AgentPoeAnchor
  }

  /**
   * Recalculate trust score: 60% success rate, 25% recency, 15% revenue.
   */
  static async recalculateScore(
    supabase: SupabaseClient,
    agentId: string,
    workspaceId: string,
  ): Promise<AgentTrustScore> {
    const scoreRow = await TrustScoringService.getOrCreateScore(supabase, agentId, workspaceId)

    // Count iterations from anchors
    const { count: totalCount } = await supabase
      .from('agent_poe_anchors')
      .select('*', { count: 'exact', head: true })
      .eq('agent_id', agentId)
      .eq('workspace_id', workspaceId)

    const { count: successCount } = await supabase
      .from('agent_poe_anchors')
      .select('*', { count: 'exact', head: true })
      .eq('agent_id', agentId)
      .eq('workspace_id', workspaceId)
      .eq('outcome', 'success')

    const { count: failedCount } = await supabase
      .from('agent_poe_anchors')
      .select('*', { count: 'exact', head: true })
      .eq('agent_id', agentId)
      .eq('workspace_id', workspaceId)
      .eq('outcome', 'failure')

    const { count: cancelledCount } = await supabase
      .from('agent_poe_anchors')
      .select('*', { count: 'exact', head: true })
      .eq('agent_id', agentId)
      .eq('workspace_id', workspaceId)
      .eq('outcome', 'cancelled')

    const total = totalCount ?? 0
    const successful = successCount ?? 0
    const failed = failedCount ?? 0
    const cancelled = cancelledCount ?? 0

    // Success rate component (60 points max)
    const successRate = total > 0 ? successful / total : 0.5
    const successComponent = successRate * 60

    // Recency bonus (25 points max) — decay over 7 days
    const { data: latestAnchor } = await supabase
      .from('agent_poe_anchors')
      .select('created_at')
      .eq('agent_id', agentId)
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    let recencyBonus = 0
    if (latestAnchor?.created_at) {
      const hoursSince = (Date.now() - new Date(latestAnchor.created_at).getTime()) / (1000 * 60 * 60)
      if (hoursSince < 24) {
        recencyBonus = 25
      } else if (hoursSince < 168) {
        // Linear decay from 25 to 0 over 24h–168h (7 days)
        recencyBonus = 25 * (1 - (hoursSince - 24) / (168 - 24))
      }
    }

    // Revenue component (15 points max) — caps at $100 (10000 cents)
    const { data: revenueData } = await supabase
      .from('revenue_attributions')
      .select('amount_cents')
      .eq('agent_id', agentId)
      .eq('workspace_id', workspaceId)

    const totalRevenueCents = (revenueData ?? []).reduce((sum, r) => sum + (r.amount_cents ?? 0), 0)
    const revenueScore = Math.min(15, totalRevenueCents / 10000 * 15)

    const newScore = Math.round((successComponent + recencyBonus + revenueScore) * 100) / 100

    // Compute avg duration from anchors that have duration
    const { data: durationData } = await supabase
      .from('agent_poe_anchors')
      .select('duration_ms')
      .eq('agent_id', agentId)
      .eq('workspace_id', workspaceId)
      .not('duration_ms', 'is', null)

    const durations = (durationData ?? []).map((d) => d.duration_ms).filter((d): d is number => d != null)
    const avgDuration = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null

    // Append to score_history sparkline (keep last 50 entries)
    const history = Array.isArray(scoreRow.score_history) ? scoreRow.score_history : []
    const newHistory = [...history, { score: newScore, timestamp: new Date().toISOString() }].slice(-50)

    const { data: updated, error } = await supabase
      .from('agent_trust_scores')
      .update({
        score: newScore,
        total_iterations: total,
        successful_iterations: successful,
        failed_iterations: failed,
        cancelled_iterations: cancelled,
        avg_duration_ms: avgDuration,
        last_iteration_at: latestAnchor?.created_at ?? scoreRow.last_iteration_at,
        revenue_correlation: revenueScore,
        score_history: newHistory,
      })
      .eq('id', scoreRow.id)
      .select('*')
      .single()

    if (error) throw new Error(`[TrustScoring] recalculateScore failed: ${error.message}`)
    return updated as AgentTrustScore
  }

  /**
   * Check if agent qualifies for tier change.
   */
  static async evaluateGraduation(
    supabase: SupabaseClient,
    agentId: string,
    workspaceId: string,
  ): Promise<void> {
    const [{ data: agent }, score] = await Promise.all([
      supabase.from('agents').select('*').eq('id', agentId).single(),
      TrustScoringService.getOrCreateScore(supabase, agentId, workspaceId),
    ])

    if (!agent) return
    const currentTier = agent.autonomy_tier as AutonomyTier

    // Demotion check: score < 40 OR 3 consecutive failures
    if (score.score < 40 && currentTier !== 'off' && currentTier !== 'advisor') {
      const demoteTier: AutonomyTier = currentTier === 'near_full' ? 'bounded' : 'advisor'
      await TrustScoringService.graduateAgent(supabase, {
        agentId,
        workspaceId,
        previousTier: currentTier,
        newTier: demoteTier,
        reason: `Score dropped below 40 (${score.score})`,
        scoreAtChange: score.score,
      })
      return
    }

    // Check 3 consecutive failures for demotion
    const { data: recentAnchors } = await supabase
      .from('agent_poe_anchors')
      .select('outcome')
      .eq('agent_id', agentId)
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(3)

    const lastThree = (recentAnchors ?? []).map((a) => a.outcome)
    if (lastThree.length === 3 && lastThree.every((o) => o === 'failure') && currentTier !== 'off' && currentTier !== 'advisor') {
      const demoteTier: AutonomyTier = currentTier === 'near_full' ? 'bounded' : 'advisor'
      await TrustScoringService.graduateAgent(supabase, {
        agentId,
        workspaceId,
        previousTier: currentTier,
        newTier: demoteTier,
        reason: '3 consecutive failures',
        scoreAtChange: score.score,
      })
      return
    }

    const failureRate = score.total_iterations > 0 ? score.failed_iterations / score.total_iterations : 0

    // Promotion: advisor → bounded (score >= 70, 10+ successful, < 30% failure)
    if (currentTier === 'advisor' && score.score >= 70 && score.successful_iterations >= 10 && failureRate < 0.3) {
      await TrustScoringService.graduateAgent(supabase, {
        agentId,
        workspaceId,
        previousTier: 'advisor',
        newTier: 'bounded',
        reason: `Auto-promotion: score=${score.score}, ${score.successful_iterations} successful, ${Math.round(failureRate * 100)}% failure rate`,
        scoreAtChange: score.score,
      })
      return
    }

    // Promotion: bounded → near_full (score >= 85, 25+ successful, < 10% failure, zero failed in last 5)
    if (currentTier === 'bounded' && score.score >= 85 && score.successful_iterations >= 25 && failureRate < 0.1) {
      const { data: lastFive } = await supabase
        .from('agent_poe_anchors')
        .select('outcome')
        .eq('agent_id', agentId)
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(5)

      const hasRecentFailure = (lastFive ?? []).some((a) => a.outcome === 'failure')
      if (!hasRecentFailure) {
        await TrustScoringService.graduateAgent(supabase, {
          agentId,
          workspaceId,
          previousTier: 'bounded',
          newTier: 'near_full',
          reason: `Auto-promotion: score=${score.score}, ${score.successful_iterations} successful, zero failures in last 5`,
          scoreAtChange: score.score,
        })
      }
    }
  }

  /**
   * Execute tier change: update agents, insert graduation log + ledger event.
   */
  static async graduateAgent(
    supabase: SupabaseClient,
    opts: {
      agentId: string
      workspaceId: string
      previousTier: AutonomyTier
      newTier: AutonomyTier
      reason: string
      scoreAtChange: number
      triggeredBy?: string
    },
  ): Promise<AutonomyGraduationLogEntry> {
    // Update agents table
    const { error: updateError } = await supabase
      .from('agents')
      .update({ autonomy_tier: opts.newTier })
      .eq('id', opts.agentId)

    if (updateError) throw new Error(`[TrustScoring] graduateAgent update failed: ${updateError.message}`)

    // Insert graduation log
    const { data: logEntry, error: logError } = await supabase
      .from('autonomy_graduation_log')
      .insert({
        agent_id: opts.agentId,
        workspace_id: opts.workspaceId,
        previous_tier: opts.previousTier,
        new_tier: opts.newTier,
        trigger_reason: opts.reason,
        trust_score_at_change: opts.scoreAtChange,
        triggered_by: opts.triggeredBy ?? null,
      })
      .select('*')
      .single()

    if (logError) throw new Error(`[TrustScoring] graduation log insert failed: ${logError.message}`)

    // Insert ledger event for graduation
    await supabase.from('ledger_events').insert({
      type: 'agent.graduation',
      source: 'trust_scoring_service',
      context_id: opts.agentId,
      workspace_id: opts.workspaceId,
      payload: {
        agent_id: opts.agentId,
        previous_tier: opts.previousTier,
        new_tier: opts.newTier,
        reason: opts.reason,
        score: opts.scoreAtChange,
      },
    })

    console.log(`[TrustScoring] Agent ${opts.agentId} graduated: ${opts.previousTier} → ${opts.newTier} (${opts.reason})`)

    return logEntry as AutonomyGraduationLogEntry
  }

  /**
   * Insert revenue attribution.
   */
  static async attributeRevenue(
    supabase: SupabaseClient,
    opts: {
      agentId: string
      workspaceId: string
      poeAnchorId?: string
      amountCents: number
      currency?: string
      stripeEventId?: string
      description?: string
    },
  ): Promise<void> {
    const { error } = await supabase.from('revenue_attributions').insert({
      agent_id: opts.agentId,
      workspace_id: opts.workspaceId,
      poe_anchor_id: opts.poeAnchorId ?? null,
      amount_cents: opts.amountCents,
      currency: opts.currency ?? 'usd',
      stripe_event_id: opts.stripeEventId ?? null,
      description: opts.description ?? null,
    })

    if (error) throw new Error(`[TrustScoring] attributeRevenue failed: ${error.message}`)

    // Trigger score recalculation to pick up new revenue
    await TrustScoringService.recalculateScore(supabase, opts.agentId, opts.workspaceId)
  }

  /**
   * Full reputation profile for UI.
   */
  static async getReputationProfile(
    supabase: SupabaseClient,
    agentId: string,
    workspaceId: string,
  ): Promise<AgentReputationProfile | null> {
    const [
      { data: agent },
      trustScore,
      { data: recentAnchors },
      { data: graduations },
      { data: revenue },
    ] = await Promise.all([
      supabase.from('agents').select('*').eq('id', agentId).single(),
      TrustScoringService.getOrCreateScore(supabase, agentId, workspaceId),
      supabase
        .from('agent_poe_anchors')
        .select('*')
        .eq('agent_id', agentId)
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('autonomy_graduation_log')
        .select('*')
        .eq('agent_id', agentId)
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false }),
      supabase
        .from('revenue_attributions')
        .select('amount_cents')
        .eq('agent_id', agentId)
        .eq('workspace_id', workspaceId),
    ])

    if (!agent) return null

    const revenueTotalCents = (revenue ?? []).reduce((sum, r) => sum + (r.amount_cents ?? 0), 0)

    return {
      agent: agent as Agent,
      trust_score: trustScore,
      recent_anchors: (recentAnchors ?? []) as AgentPoeAnchor[],
      graduations: (graduations ?? []) as AutonomyGraduationLogEntry[],
      revenue_total_cents: revenueTotalCents,
    }
  }
}
