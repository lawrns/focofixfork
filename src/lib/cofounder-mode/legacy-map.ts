import type { CoFounderPolicy } from '@/lib/autonomy/types'
import { DEFAULT_COFOUNDER_MODE_CONFIG, mergeCoFounderModeConfig, parseCoFounderModeConfig } from '@/lib/cofounder-mode/parse'
import type { CoFounderModeConfigV1 } from '@/lib/cofounder-mode/types'

function toRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return {}
}

const LEGACY_DEFAULT_COFOUNDER_POLICY: CoFounderPolicy = {
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

export function mapLegacyAIPolicyToCoFounderModePatch(rawAiPolicy: unknown): Partial<CoFounderModeConfigV1> {
  const aiPolicy = toRecord(rawAiPolicy)
  const cofounder = toRecord(aiPolicy.cofounder)

  if (Object.keys(cofounder).length === 0) {
    return {}
  }

  return {
    mode: (cofounder.mode as CoFounderModeConfigV1['mode']) ?? DEFAULT_COFOUNDER_MODE_CONFIG.mode,
    profile: (cofounder.profile as CoFounderModeConfigV1['profile']) ?? DEFAULT_COFOUNDER_MODE_CONFIG.profile,
    overnightWindow: {
      enabled:
        typeof toRecord(cofounder.overnightWindow).enabled === 'boolean'
          ? (toRecord(cofounder.overnightWindow).enabled as boolean)
          : DEFAULT_COFOUNDER_MODE_CONFIG.overnightWindow.enabled,
      timezone:
        typeof toRecord(cofounder.overnightWindow).timezone === 'string'
          ? (toRecord(cofounder.overnightWindow).timezone as string)
          : DEFAULT_COFOUNDER_MODE_CONFIG.overnightWindow.timezone,
      start:
        typeof toRecord(cofounder.overnightWindow).start === 'string'
          ? (toRecord(cofounder.overnightWindow).start as string)
          : DEFAULT_COFOUNDER_MODE_CONFIG.overnightWindow.start,
      end:
        typeof toRecord(cofounder.overnightWindow).end === 'string'
          ? (toRecord(cofounder.overnightWindow).end as string)
          : DEFAULT_COFOUNDER_MODE_CONFIG.overnightWindow.end,
    },
    hardLimits: {
      spendCapUsdPerWindow:
        typeof toRecord(cofounder.hardLimits).spendCapUsdPerWindow === 'number'
          ? (toRecord(cofounder.hardLimits).spendCapUsdPerWindow as number)
          : DEFAULT_COFOUNDER_MODE_CONFIG.hardLimits.spendCapUsdPerWindow,
      maxExternalMessages:
        typeof toRecord(cofounder.hardLimits).maxExternalMessages === 'number'
          ? (toRecord(cofounder.hardLimits).maxExternalMessages as number)
          : DEFAULT_COFOUNDER_MODE_CONFIG.hardLimits.maxExternalMessages,
      maxLiveExperiments:
        typeof toRecord(cofounder.hardLimits).maxLiveExperiments === 'number'
          ? (toRecord(cofounder.hardLimits).maxLiveExperiments as number)
          : DEFAULT_COFOUNDER_MODE_CONFIG.hardLimits.maxLiveExperiments,
      allowProductionDeploys:
        typeof toRecord(cofounder.hardLimits).allowProductionDeploys === 'boolean'
          ? (toRecord(cofounder.hardLimits).allowProductionDeploys as boolean)
          : DEFAULT_COFOUNDER_MODE_CONFIG.hardLimits.allowProductionDeploys,
    },
    actionPolicies: {
      allowedDomains: Array.isArray(toRecord(cofounder.actionPolicies).allowedDomains)
        ? (toRecord(cofounder.actionPolicies).allowedDomains as string[])
        : DEFAULT_COFOUNDER_MODE_CONFIG.actionPolicies.allowedDomains,
      blockedActionTypes: Array.isArray(toRecord(cofounder.actionPolicies).blockedActionTypes)
        ? (toRecord(cofounder.actionPolicies).blockedActionTypes as string[])
        : DEFAULT_COFOUNDER_MODE_CONFIG.actionPolicies.blockedActionTypes,
      requireApprovalActionTypes: Array.isArray(toRecord(cofounder.actionPolicies).requireApprovalActionTypes)
        ? (toRecord(cofounder.actionPolicies).requireApprovalActionTypes as string[])
        : DEFAULT_COFOUNDER_MODE_CONFIG.actionPolicies.requireApprovalActionTypes,
    },
    trustGates: {
      minConfidenceToExecute:
        typeof toRecord(cofounder.trustGates).minConfidenceToExecute === 'number'
          ? (toRecord(cofounder.trustGates).minConfidenceToExecute as number)
          : DEFAULT_COFOUNDER_MODE_CONFIG.trustGates.minConfidenceToExecute,
      minTrustScoreToRaiseAutonomy:
        typeof toRecord(cofounder.trustGates).minTrustScoreToRaiseAutonomy === 'number'
          ? (toRecord(cofounder.trustGates).minTrustScoreToRaiseAutonomy as number)
          : DEFAULT_COFOUNDER_MODE_CONFIG.trustGates.minTrustScoreToRaiseAutonomy,
    },
  }
}

export function mapCanonicalConfigToLegacyPolicy(config: CoFounderModeConfigV1): CoFounderPolicy {
  const mode = config.mode === 'full_auto' ? 'near_full' : config.mode
  const profile = config.profile === 'full_auto' ? 'near_full' : config.profile

  return {
    mode,
    profile,
    overnightWindow: {
      ...config.overnightWindow,
    },
    hardLimits: {
      ...config.hardLimits,
    },
    actionPolicies: {
      ...config.actionPolicies,
    },
    trustGates: {
      ...config.trustGates,
    },
  }
}

export function mapLegacyPolicyToCanonicalConfig(policy: CoFounderPolicy): CoFounderModeConfigV1 {
  const patch: Partial<CoFounderModeConfigV1> = {
    mode: policy.mode,
    profile: policy.profile,
    overnightWindow: {
      ...policy.overnightWindow,
    },
    hardLimits: {
      ...policy.hardLimits,
    },
    actionPolicies: {
      ...policy.actionPolicies,
    },
    trustGates: {
      ...policy.trustGates,
    },
  }

  return parseCoFounderModeConfig(mergeCoFounderModeConfig(DEFAULT_COFOUNDER_MODE_CONFIG, patch)).config
}

export function normalizeLegacyPolicy(policy: CoFounderPolicy): CoFounderPolicy {
  const canonical = mapLegacyPolicyToCanonicalConfig(policy)
  return mapCanonicalConfigToLegacyPolicy(canonical)
}

export function legacyDefaults(): CoFounderPolicy {
  return {
    ...LEGACY_DEFAULT_COFOUNDER_POLICY,
    overnightWindow: { ...LEGACY_DEFAULT_COFOUNDER_POLICY.overnightWindow },
    hardLimits: { ...LEGACY_DEFAULT_COFOUNDER_POLICY.hardLimits },
    actionPolicies: {
      ...LEGACY_DEFAULT_COFOUNDER_POLICY.actionPolicies,
      allowedDomains: [...LEGACY_DEFAULT_COFOUNDER_POLICY.actionPolicies.allowedDomains],
      blockedActionTypes: [...LEGACY_DEFAULT_COFOUNDER_POLICY.actionPolicies.blockedActionTypes],
      requireApprovalActionTypes: [...LEGACY_DEFAULT_COFOUNDER_POLICY.actionPolicies.requireApprovalActionTypes],
    },
    trustGates: { ...LEGACY_DEFAULT_COFOUNDER_POLICY.trustGates },
  }
}
