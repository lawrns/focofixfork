import type {
  CoFounderActionValidationInput,
  CoFounderAgentVote,
  CoFounderDecisionResult,
  CoFounderModeConfigV1,
} from '@/lib/cofounder-mode/types'

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/

function toMinutes(value: string): number {
  const [hour, minute] = value.split(':').map((n) => parseInt(n, 10))
  return (hour * 60) + minute
}

function getMinutesInTimezone(now: Date, timezone: string): number {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
    })
    const parts = formatter.formatToParts(now)
    const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? NaN)
    const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? NaN)
    if (Number.isFinite(hour) && Number.isFinite(minute)) {
      return (hour * 60) + minute
    }
  } catch {
    // Ignore invalid timezone and use local server time.
  }

  return (now.getHours() * 60) + now.getMinutes()
}

export function isInCoFounderOvernightWindow(config: CoFounderModeConfigV1, now: Date = new Date()): boolean {
  if (!config.overnightWindow.enabled) return true
  if (!TIME_RE.test(config.overnightWindow.start) || !TIME_RE.test(config.overnightWindow.end)) {
    return true
  }

  const mins = getMinutesInTimezone(now, config.overnightWindow.timezone)
  const start = toMinutes(config.overnightWindow.start)
  const end = toMinutes(config.overnightWindow.end)

  if (start <= end) {
    return mins >= start && mins < end
  }

  return mins >= start || mins < end
}

function normalizeVotes(config: CoFounderModeConfigV1, action: CoFounderActionValidationInput): CoFounderAgentVote[] {
  if (Array.isArray(action.agentVotes) && action.agentVotes.length > 0) {
    return action.agentVotes
  }

  return config.agents
    .filter((agent) => agent.enabled)
    .map((agent) => ({
      agentId: agent.id,
      approve: true,
      confidence: action.confidence ?? config.trustGates.minConfidenceToExecute,
      weight: agent.weight,
    }))
}

function computeVoteMetrics(config: CoFounderModeConfigV1, action: CoFounderActionValidationInput) {
  const votes = normalizeVotes(config, action)
  const weightByAgent = new Map(config.agents.map((agent) => [agent.id, agent.weight]))

  const breakdown = votes.map((vote) => {
    const configuredWeight = weightByAgent.get(vote.agentId) ?? 1
    const effectiveWeight = (vote.weight ?? configuredWeight) * Math.max(0, Math.min(1, vote.confidence))
    return {
      agentId: vote.agentId,
      approve: vote.approve,
      confidence: vote.confidence,
      effectiveWeight,
    }
  })

  const totalWeight = breakdown.reduce((sum, row) => sum + row.effectiveWeight, 0)
  if (totalWeight <= 0) {
    return {
      weightedApproval: 0,
      weightedConfidence: 0,
      divergenceScore: 0,
      voteBreakdown: breakdown,
    }
  }

  const approvalWeight = breakdown
    .filter((row) => row.approve)
    .reduce((sum, row) => sum + row.effectiveWeight, 0)

  const weightedApproval = approvalWeight / totalWeight
  const weightedConfidence = breakdown.reduce((sum, row) => sum + (row.confidence * row.effectiveWeight), 0) / totalWeight

  const meanSupport = breakdown.reduce(
    (sum, row) => sum + ((row.approve ? 1 : -1) * row.effectiveWeight),
    0
  ) / totalWeight

  const variance = breakdown.reduce((sum, row) => {
    const support = (row.approve ? 1 : -1)
    const delta = support - meanSupport
    return sum + ((delta * delta) * (row.effectiveWeight / totalWeight))
  }, 0)

  const divergenceScore = Math.min(1, Math.sqrt(Math.max(0, variance)) / 2)

  return {
    weightedApproval,
    weightedConfidence,
    divergenceScore,
    voteBreakdown: breakdown,
  }
}

export function evaluateActionAgainstCoFounderConfig(
  config: CoFounderModeConfigV1,
  action: CoFounderActionValidationInput
): CoFounderDecisionResult {
  const reasons: string[] = []
  const violatedRules: string[] = []
  let requiresApproval = false

  const actionType = action.actionType.trim()
  const domain = action.domain.trim().toLowerCase()
  const confidence = action.confidence ?? 0
  const estimatedSpend = action.estimatedSpendUsd ?? 0
  const externalMessages = action.externalMessageCount ?? 0
  const liveExperiments = action.liveExperimentCount ?? 0

  const voteMetrics = computeVoteMetrics(config, action)

  if (config.mode === 'off') {
    violatedRules.push('mode_off')
    reasons.push('Autonomy mode is off')
  }

  if (config.mode === 'advisor') {
    requiresApproval = true
    reasons.push('Advisor mode requires human approval for all actions')
  }

  if (config.actionPolicies.blockedActionTypes.includes(actionType)) {
    violatedRules.push('blocked_action_type')
    reasons.push(`Action type ${actionType} is blocked by policy`)
  }

  if (!config.actionPolicies.allowedDomains.includes(domain)) {
    violatedRules.push('domain_not_allowed')
    reasons.push(`Domain ${domain} is not allowed for autonomous execution`)
  }

  if (action.productionImpact === true && !config.hardLimits.allowProductionDeploys) {
    violatedRules.push('production_deploy_blocked')
    reasons.push('Production deploys are disabled by hard limits')
  }

  if (estimatedSpend > config.hardLimits.spendCapUsdPerWindow) {
    violatedRules.push('spend_cap_exceeded')
    reasons.push('Estimated spend exceeds configured cap')
  }

  if (externalMessages > config.hardLimits.maxExternalMessages) {
    violatedRules.push('message_cap_exceeded')
    reasons.push('External message volume exceeds configured cap')
  }

  if (liveExperiments > config.hardLimits.maxLiveExperiments) {
    violatedRules.push('experiment_cap_exceeded')
    reasons.push('Live experiment count exceeds configured cap')
  }

  if (confidence < config.trustGates.minConfidenceToExecute) {
    requiresApproval = true
    reasons.push('Model confidence is below execution threshold')
  }

  if (typeof action.trustScore === 'number' && action.trustScore < config.trustGates.minTrustScoreToRaiseAutonomy) {
    requiresApproval = true
    reasons.push('Trust score is below autonomous promotion gate')
  }

  if (config.actionPolicies.requireApprovalActionTypes.includes(actionType)) {
    requiresApproval = true
    reasons.push(`Action type ${actionType} requires approval`)
  }

  const isIrreversibleType = config.decisionEngine.irreversibleActionTypes.includes(actionType)
  if (action.irreversible === true || isIrreversibleType) {
    requiresApproval = true
    reasons.push('Irreversible action requires explicit approval')
  }

  if (voteMetrics.divergenceScore >= config.decisionEngine.divergenceThreshold) {
    requiresApproval = true
    reasons.push('Agent divergence exceeded threshold')
  }

  if (voteMetrics.weightedApproval < 0.5) {
    violatedRules.push('vote_rejected')
    reasons.push('Weighted vote rejected the action')
  }

  if (action.integrationKey) {
    const integration = config.integrations.find((item) => item.key === action.integrationKey)
    if (!integration) {
      violatedRules.push('integration_not_configured')
      reasons.push(`Integration ${action.integrationKey} is not configured`)
    } else if (action.actionKind === 'write') {
      if (!integration.allowWrites || integration.access === 'read_only') {
        violatedRules.push('integration_read_only')
        reasons.push(`Integration ${action.integrationKey} is read-only`)
      }
      if (integration.requiresApprovalForWrites || integration.access === 'approval_required') {
        requiresApproval = true
        reasons.push(`Writes on ${action.integrationKey} require approval`)
      }
    }
  }

  const allowed = violatedRules.length === 0

  return {
    allowed,
    requiresApproval,
    reasons,
    violatedRules,
    effectiveMode: config.mode,
    meta: {
      weightedApproval: voteMetrics.weightedApproval,
      weightedConfidence: voteMetrics.weightedConfidence,
      divergenceScore: voteMetrics.divergenceScore,
      resolution: allowed ? (requiresApproval ? 'approval_required' : 'execute') : 'blocked',
      voteBreakdown: voteMetrics.voteBreakdown,
      tieBrokenBy: config.decisionEngine.tieBreaker,
    },
  }
}
