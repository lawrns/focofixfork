import type { SupabaseClient } from '@supabase/supabase-js'
import type { CoFounderActionValidationInput } from '@/lib/cofounder-mode/types'
import { evaluateActionAgainstCoFounderConfig, isInCoFounderOvernightWindow } from '@/lib/cofounder-mode/decision-engine'
import { resolveEffectiveCoFounderModeConfig } from '@/lib/cofounder-mode/config-resolver'
import { mapCanonicalConfigToLegacyPolicy } from '@/lib/cofounder-mode/legacy-map'
import { recordCofounderErrorAudit } from '@/lib/cofounder-mode/runtime'

export interface ValidateActionExecutionResult {
  configSource: string
  issues: string[]
  canonicalConfig: Awaited<ReturnType<typeof resolveEffectiveCoFounderModeConfig>>['config']
  legacyPolicy: ReturnType<typeof mapCanonicalConfigToLegacyPolicy>
  decision: ReturnType<typeof evaluateActionAgainstCoFounderConfig>
}

export async function validateCoFounderAction(
  supabase: SupabaseClient,
  userId: string,
  action: CoFounderActionValidationInput,
  workspaceId?: string | null,
  sessionId?: string | null
): Promise<ValidateActionExecutionResult> {
  const resolved = await resolveEffectiveCoFounderModeConfig(supabase, userId, workspaceId)
  const decision = evaluateActionAgainstCoFounderConfig(resolved.config, action)

  if (process.env.COFOUNDER_FULL_AUTO_ENABLED !== 'true') {
    if (decision.allowed) {
      decision.requiresApproval = true
      decision.reasons = [...decision.reasons, 'Full-auto execution is disabled by environment flag']
      decision.meta.resolution = 'approval_required'
    }
  }

  if (!isInCoFounderOvernightWindow(resolved.config)) {
    decision.allowed = false
    decision.violatedRules = [...decision.violatedRules, 'outside_overnight_window']
    decision.reasons = [...decision.reasons, 'Action is outside configured overnight window']
    decision.meta.resolution = 'blocked'
  }

  try {
    const runtimePatch = {
      autonomy_mode: resolved.config.mode,
      trust_score: decision.meta.weightedConfidence,
      active_initiatives: [],
      state: {
        lastSessionId: sessionId ?? null,
        lastActionType: action.actionType,
        lastDecisionAt: new Date().toISOString(),
        lastResolution: decision.meta.resolution,
      },
    }

    let runtimeUpdate = supabase
      .from('cofounder_runtime_state')
      .update(runtimePatch)
      .eq('user_id', userId)

    if (workspaceId) {
      runtimeUpdate = runtimeUpdate.eq('workspace_id', workspaceId)
    } else {
      runtimeUpdate = runtimeUpdate.is('workspace_id', null)
    }

    const { data: updatedRuntimeRows } = await runtimeUpdate
      .select('id')
      .returns<Array<{ id: string }>>()

    if (!updatedRuntimeRows || updatedRuntimeRows.length === 0) {
      await supabase.from('cofounder_runtime_state').insert({
        user_id: userId,
        workspace_id: workspaceId ?? null,
        ...runtimePatch,
      })
    }

    await supabase.from('cofounder_decision_audit').insert({
      user_id: userId,
      workspace_id: workspaceId ?? null,
      action_type: action.actionType,
      domain: action.domain,
      input: action as unknown as Record<string, unknown>,
      votes: decision.meta.voteBreakdown as unknown as Record<string, unknown>[],
      result: decision as unknown as Record<string, unknown>,
      confidence: decision.meta.weightedConfidence,
      divergence: decision.meta.divergenceScore,
      resolution: decision.meta.resolution,
    })

    await supabase.from('cofounder_decisions_history').insert({
      user_id: userId,
      workspace_id: workspaceId ?? null,
      event_type: 'decision',
      severity: decision.allowed ? (decision.requiresApproval ? 'warning' : 'info') : 'error',
      title: `${action.actionType} (${action.domain})`,
      detail: decision.reasons.join('; '),
      payload: {
        sessionId: sessionId ?? null,
        action,
        decision,
      },
    })
  } catch (error: unknown) {
    // Graceful degradation: fall back to manual approval mode on persistence failure.
    decision.requiresApproval = true
    decision.allowed = true
    decision.reasons = [...decision.reasons, 'Audit persistence failed; falling back to manual approval mode']
    decision.violatedRules = decision.violatedRules.filter((rule) => rule !== 'vote_rejected')
    decision.meta.resolution = 'approval_required'

    try {
      await recordCofounderErrorAudit(supabase, {
        userId,
        workspaceId,
        errorCode: 'decision_audit_persist_failed',
        message: error instanceof Error ? error.message : 'Unknown persistence error',
        context: {
          actionType: action.actionType,
          domain: action.domain,
        },
      })
    } catch {
      // Swallow secondary audit errors to preserve fail-open response behavior.
    }
  }

  return {
    configSource: resolved.source,
    issues: resolved.issues,
    canonicalConfig: resolved.config,
    legacyPolicy: mapCanonicalConfigToLegacyPolicy(resolved.config),
    decision,
  }
}
