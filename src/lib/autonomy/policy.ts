import type {
  CoFounderPolicy,
  CoFounderValidateActionInput,
  CoFounderValidateActionResult,
} from '@/lib/autonomy/types'

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/

export const DEFAULT_COFOUNDER_POLICY: CoFounderPolicy = {
  mode: 'bounded',
  profile: 'revenue_only',
  overnightWindow: {
    enabled: true,
    timezone: 'America/Mexico_City',
    start: '22:00',
    end: '07:00',
  },
  hardLimits: {
    spendCapUsdPerWindow: 100,
    maxExternalMessages: 5,
    maxLiveExperiments: 2,
    allowProductionDeploys: false,
  },
  actionPolicies: {
    allowedDomains: ['revenue', 'growth', 'sales', 'ops', 'backlog'],
    blockedActionTypes: ['deployment', 'dataDeletion', 'publicAnnouncement', 'legalCommitment'],
    requireApprovalActionTypes: ['budgetCommitment', 'contractChange', 'pricingChange'],
  },
  trustGates: {
    minConfidenceToExecute: 0.7,
    minTrustScoreToRaiseAutonomy: 0.8,
  },
}

function coerceNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function coerceBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function coerceString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.length > 0 ? value : fallback
}

function coerceStringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback
  const next = value.filter((item): item is string => typeof item === 'string' && item.length > 0)
  return next.length > 0 ? next : fallback
}

function isValidTime(value: string): boolean {
  return TIME_RE.test(value)
}

export function resolveCoFounderPolicy(rawAiPolicy: unknown): CoFounderPolicy {
  const maybeAIPolicy = rawAiPolicy && typeof rawAiPolicy === 'object'
    ? (rawAiPolicy as Record<string, unknown>)
    : {}
  const raw = maybeAIPolicy.cofounder && typeof maybeAIPolicy.cofounder === 'object'
    ? (maybeAIPolicy.cofounder as Record<string, unknown>)
    : {}

  const merged: CoFounderPolicy = {
    mode: coerceString(raw.mode, DEFAULT_COFOUNDER_POLICY.mode) as CoFounderPolicy['mode'],
    profile: coerceString(raw.profile, DEFAULT_COFOUNDER_POLICY.profile) as CoFounderPolicy['profile'],
    overnightWindow: {
      enabled: coerceBoolean((raw.overnightWindow as Record<string, unknown> | undefined)?.enabled, DEFAULT_COFOUNDER_POLICY.overnightWindow.enabled),
      timezone: coerceString((raw.overnightWindow as Record<string, unknown> | undefined)?.timezone, DEFAULT_COFOUNDER_POLICY.overnightWindow.timezone),
      start: coerceString((raw.overnightWindow as Record<string, unknown> | undefined)?.start, DEFAULT_COFOUNDER_POLICY.overnightWindow.start),
      end: coerceString((raw.overnightWindow as Record<string, unknown> | undefined)?.end, DEFAULT_COFOUNDER_POLICY.overnightWindow.end),
    },
    hardLimits: {
      spendCapUsdPerWindow: coerceNumber((raw.hardLimits as Record<string, unknown> | undefined)?.spendCapUsdPerWindow, DEFAULT_COFOUNDER_POLICY.hardLimits.spendCapUsdPerWindow),
      maxExternalMessages: coerceNumber((raw.hardLimits as Record<string, unknown> | undefined)?.maxExternalMessages, DEFAULT_COFOUNDER_POLICY.hardLimits.maxExternalMessages),
      maxLiveExperiments: coerceNumber((raw.hardLimits as Record<string, unknown> | undefined)?.maxLiveExperiments, DEFAULT_COFOUNDER_POLICY.hardLimits.maxLiveExperiments),
      allowProductionDeploys: coerceBoolean((raw.hardLimits as Record<string, unknown> | undefined)?.allowProductionDeploys, DEFAULT_COFOUNDER_POLICY.hardLimits.allowProductionDeploys),
    },
    actionPolicies: {
      allowedDomains: coerceStringArray((raw.actionPolicies as Record<string, unknown> | undefined)?.allowedDomains, DEFAULT_COFOUNDER_POLICY.actionPolicies.allowedDomains),
      blockedActionTypes: coerceStringArray((raw.actionPolicies as Record<string, unknown> | undefined)?.blockedActionTypes, DEFAULT_COFOUNDER_POLICY.actionPolicies.blockedActionTypes),
      requireApprovalActionTypes: coerceStringArray((raw.actionPolicies as Record<string, unknown> | undefined)?.requireApprovalActionTypes, DEFAULT_COFOUNDER_POLICY.actionPolicies.requireApprovalActionTypes),
    },
    trustGates: {
      minConfidenceToExecute: coerceNumber((raw.trustGates as Record<string, unknown> | undefined)?.minConfidenceToExecute, DEFAULT_COFOUNDER_POLICY.trustGates.minConfidenceToExecute),
      minTrustScoreToRaiseAutonomy: coerceNumber((raw.trustGates as Record<string, unknown> | undefined)?.minTrustScoreToRaiseAutonomy, DEFAULT_COFOUNDER_POLICY.trustGates.minTrustScoreToRaiseAutonomy),
    },
  }

  if (!isValidTime(merged.overnightWindow.start)) merged.overnightWindow.start = DEFAULT_COFOUNDER_POLICY.overnightWindow.start
  if (!isValidTime(merged.overnightWindow.end)) merged.overnightWindow.end = DEFAULT_COFOUNDER_POLICY.overnightWindow.end

  if (!['off', 'advisor', 'bounded', 'near_full'].includes(merged.mode)) {
    merged.mode = DEFAULT_COFOUNDER_POLICY.mode
  }
  if (!['advisor_first', 'bounded_operator', 'revenue_only', 'near_full'].includes(merged.profile)) {
    merged.profile = DEFAULT_COFOUNDER_POLICY.profile
  }

  return merged
}

function toMinutes(value: string): number {
  const [h, m] = value.split(':').map((n) => parseInt(n, 10))
  return (h * 60) + m
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
    // Fall back to server-local time when timezone is invalid.
  }

  return now.getHours() * 60 + now.getMinutes()
}

export function isInOvernightWindow(policy: CoFounderPolicy, now: Date = new Date()): boolean {
  if (!policy.overnightWindow.enabled) return true
  const mins = getMinutesInTimezone(now, policy.overnightWindow.timezone)
  const start = toMinutes(policy.overnightWindow.start)
  const end = toMinutes(policy.overnightWindow.end)
  if (start <= end) return mins >= start && mins < end
  return mins >= start || mins < end
}

export function evaluateActionAgainstPolicy(
  policy: CoFounderPolicy,
  action: CoFounderValidateActionInput
): CoFounderValidateActionResult {
  const reasons: string[] = []
  const violatedRules: string[] = []
  let requiresApproval = false

  if (policy.mode === 'off') {
    violatedRules.push('mode_off')
    reasons.push('Autonomy mode is off')
  }

  if (policy.mode === 'advisor') {
    requiresApproval = true
    reasons.push('Advisor mode requires approval for all actions')
  }

  const actionType = action.actionType.trim()
  const domain = action.domain.trim().toLowerCase()
  const confidence = action.confidence ?? 0
  const estimatedSpend = action.estimatedSpendUsd ?? 0
  const externalMessageCount = action.externalMessageCount ?? 0
  const liveExperimentCount = action.liveExperimentCount ?? 0

  if (policy.actionPolicies.blockedActionTypes.includes(actionType) || action.irreversible === true) {
    violatedRules.push('blocked_action_type')
    reasons.push(`Action type ${actionType} is blocked in policy`)
  }

  if (!policy.actionPolicies.allowedDomains.includes(domain)) {
    violatedRules.push('domain_not_allowed')
    reasons.push(`Domain ${domain} is not enabled for autonomous execution`)
  }

  if (action.productionImpact === true && !policy.hardLimits.allowProductionDeploys) {
    violatedRules.push('production_deploy_blocked')
    reasons.push('Production deploys are disabled by hard limits')
  }

  if (estimatedSpend > policy.hardLimits.spendCapUsdPerWindow) {
    violatedRules.push('spend_cap_exceeded')
    reasons.push('Estimated spend exceeds configured cap')
  }

  if (externalMessageCount > policy.hardLimits.maxExternalMessages) {
    violatedRules.push('message_cap_exceeded')
    reasons.push('External message volume exceeds configured cap')
  }

  if (liveExperimentCount > policy.hardLimits.maxLiveExperiments) {
    violatedRules.push('experiment_cap_exceeded')
    reasons.push('Live experiment count exceeds configured cap')
  }

  if (confidence < policy.trustGates.minConfidenceToExecute) {
    requiresApproval = true
    reasons.push('Model confidence is below execution threshold')
  }

  if (policy.actionPolicies.requireApprovalActionTypes.includes(actionType)) {
    requiresApproval = true
    reasons.push(`Action type ${actionType} requires approval`)
  }

  return {
    allowed: violatedRules.length === 0,
    requiresApproval,
    reasons,
    violatedRules,
    effectiveMode: policy.mode,
  }
}
