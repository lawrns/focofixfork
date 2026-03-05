import type {
  CoFounderAgentConfig,
  CoFounderIntegrationPolicy,
  CoFounderModeConfigV1,
  CoFounderProfile,
  CoFounderAutonomyMode,
  StrategicPriority,
} from '@/lib/cofounder-mode/types'

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/

export const DEFAULT_COFOUNDER_MODE_CONFIG: CoFounderModeConfigV1 = {
  version: 'v1',
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
  agents: [
    { id: 'ceo', label: 'CEO Agent', weight: 1, enabled: true },
    { id: 'cto', label: 'CTO Agent', weight: 1, enabled: true },
    { id: 'cfo', label: 'CFO Agent', weight: 0.8, enabled: true },
  ],
  decisionEngine: {
    divergenceThreshold: 0.35,
    tieBreaker: 'strategic_priority',
    strategicPriorityOrder: ['risk', 'revenue', 'ops', 'growth', 'brand'],
    irreversibleActionTypes: ['deployment', 'dataDeletion', 'publicAnnouncement', 'budgetCommitment'],
  },
  pivotalQuestions: {
    enabled: true,
    cooldownMinutes: 240,
    maxPivotalQuestionsPerDay: 12,
    maxNotificationsPerHour: 4,
    silentModeQueue: true,
    triggerRules: [
      'high_divergence',
      'irreversible_action',
      'legal_or_compliance_risk',
      'high_spend_commitment',
      'external_commitment',
    ],
  },
  initiatives: {
    enabled: true,
    maxActive: 6,
    staleThresholdHours: 72,
    wipLimits: {
      build: 3,
      validate: 2,
      ship: 2,
    },
    dailyCheckpointHourLocal: 9,
    weeklyTriageDayLocal: 1,
  },
  proactiveScanning: {
    enabled: true,
    cadences: {
      trends: 'daily',
      opportunities: 'weekly',
      experiments: 'monthly',
    },
    rankingFactors: {
      impactWeight: 0.4,
      confidenceWeight: 0.25,
      effortWeight: 0.2,
      urgencyWeight: 0.15,
    },
  },
  riskSynthesis: {
    enabled: true,
    correlationWeight: 0.2,
    thresholds: {
      low: 0.25,
      medium: 0.5,
      high: 0.75,
      critical: 0.9,
    },
  },
  learningRoi: {
    enabled: true,
    monthlyRollupDay: 1,
  },
  integrations: [
    {
      key: 'github',
      access: 'approval_required',
      allowReads: true,
      allowWrites: true,
      requiresApprovalForWrites: true,
    },
    {
      key: 'supabase',
      access: 'approval_required',
      allowReads: true,
      allowWrites: true,
      requiresApprovalForWrites: true,
    },
    {
      key: 'openai',
      access: 'read_write',
      allowReads: true,
      allowWrites: true,
      requiresApprovalForWrites: false,
    },
  ],
  auditArtifacts: {
    decisionAudit: true,
    errorAudit: true,
    decisionsHistory: true,
    runtimeState: true,
    redactFields: ['apiKey', 'token', 'password', 'secret'],
  },
}

export interface ParseCoFounderConfigResult {
  config: CoFounderModeConfigV1
  issues: string[]
}

function toRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return {}
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function coerceString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value : fallback
}

function coerceBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function coerceNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function coerceStringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback
  const next = value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
  return next.length > 0 ? next : fallback
}

function normalizeMode(value: unknown, fallback: CoFounderAutonomyMode): CoFounderAutonomyMode {
  const mode = coerceString(value, fallback)
  if (['off', 'advisor', 'bounded', 'near_full', 'full_auto'].includes(mode)) {
    return mode as CoFounderAutonomyMode
  }
  return fallback
}

function normalizeProfile(value: unknown, fallback: CoFounderProfile): CoFounderProfile {
  const profile = coerceString(value, fallback)
  if (['advisor_first', 'bounded_operator', 'revenue_only', 'near_full', 'full_auto'].includes(profile)) {
    return profile as CoFounderProfile
  }
  return fallback
}

function normalizeStrategicOrder(value: unknown, fallback: StrategicPriority[]): StrategicPriority[] {
  if (!Array.isArray(value)) return fallback
  const filtered = value.filter(
    (item): item is StrategicPriority =>
      typeof item === 'string' && ['revenue', 'growth', 'ops', 'risk', 'brand'].includes(item)
  )
  return filtered.length > 0 ? filtered : fallback
}

function normalizeAgents(value: unknown, fallback: CoFounderAgentConfig[]): CoFounderAgentConfig[] {
  if (!Array.isArray(value)) return fallback

  const next = value
    .map((row) => toRecord(row))
    .map((row, index) => {
      const id = coerceString(row.id, `agent_${index + 1}`)
      return {
        id,
        label: coerceString(row.label, id.toUpperCase()),
        weight: clamp(coerceNumber(row.weight, 1), 0, 10),
        enabled: coerceBoolean(row.enabled, true),
      }
    })

  return next.length > 0 ? next : fallback
}

function normalizeIntegrations(value: unknown, fallback: CoFounderIntegrationPolicy[]): CoFounderIntegrationPolicy[] {
  if (!Array.isArray(value)) return fallback
  const next = value
    .map((item) => toRecord(item))
    .map((item) => {
      const access = coerceString(item.access, 'approval_required')
      const normalizedAccess = ['read_only', 'read_write', 'approval_required'].includes(access)
        ? (access as CoFounderIntegrationPolicy['access'])
        : 'approval_required'
      const allowReads = coerceBoolean(item.allowReads, true)
      const allowWrites = coerceBoolean(item.allowWrites, normalizedAccess !== 'read_only')
      return {
        key: coerceString(item.key, 'unknown'),
        access: normalizedAccess,
        allowReads,
        allowWrites,
        requiresApprovalForWrites: coerceBoolean(item.requiresApprovalForWrites, normalizedAccess === 'approval_required'),
      }
    })
    .filter((item) => item.key !== 'unknown')

  return next.length > 0 ? next : fallback
}

export function mergeCoFounderModeConfig(
  base: CoFounderModeConfigV1,
  patch: Partial<CoFounderModeConfigV1>
): CoFounderModeConfigV1 {
  return {
    ...base,
    ...patch,
    overnightWindow: { ...base.overnightWindow, ...patch.overnightWindow },
    hardLimits: { ...base.hardLimits, ...patch.hardLimits },
    actionPolicies: { ...base.actionPolicies, ...patch.actionPolicies },
    trustGates: { ...base.trustGates, ...patch.trustGates },
    decisionEngine: { ...base.decisionEngine, ...patch.decisionEngine },
    pivotalQuestions: { ...base.pivotalQuestions, ...patch.pivotalQuestions },
    initiatives: {
      ...base.initiatives,
      ...patch.initiatives,
      wipLimits: { ...base.initiatives.wipLimits, ...patch.initiatives?.wipLimits },
    },
    proactiveScanning: {
      ...base.proactiveScanning,
      ...patch.proactiveScanning,
      cadences: { ...base.proactiveScanning.cadences, ...patch.proactiveScanning?.cadences },
      rankingFactors: {
        ...base.proactiveScanning.rankingFactors,
        ...patch.proactiveScanning?.rankingFactors,
      },
    },
    riskSynthesis: {
      ...base.riskSynthesis,
      ...patch.riskSynthesis,
      thresholds: { ...base.riskSynthesis.thresholds, ...patch.riskSynthesis?.thresholds },
    },
    learningRoi: { ...base.learningRoi, ...patch.learningRoi },
    auditArtifacts: { ...base.auditArtifacts, ...patch.auditArtifacts },
    agents: patch.agents ?? base.agents,
    integrations: patch.integrations ?? base.integrations,
  }
}

export function parseCoFounderModeConfig(raw: unknown): ParseCoFounderConfigResult {
  const root = toRecord(raw)
  const issues: string[] = []

  const overnightWindow = toRecord(root.overnightWindow)
  const hardLimits = toRecord(root.hardLimits)
  const actionPolicies = toRecord(root.actionPolicies)
  const trustGates = toRecord(root.trustGates)
  const decisionEngine = toRecord(root.decisionEngine)
  const pivotalQuestions = toRecord(root.pivotalQuestions)
  const initiatives = toRecord(root.initiatives)
  const proactiveScanning = toRecord(root.proactiveScanning)
  const riskSynthesis = toRecord(root.riskSynthesis)
  const learningRoi = toRecord(root.learningRoi)
  const auditArtifacts = toRecord(root.auditArtifacts)

  const config: CoFounderModeConfigV1 = {
    version: 'v1',
    mode: normalizeMode(root.mode, DEFAULT_COFOUNDER_MODE_CONFIG.mode),
    profile: normalizeProfile(root.profile, DEFAULT_COFOUNDER_MODE_CONFIG.profile),
    overnightWindow: {
      enabled: coerceBoolean(overnightWindow.enabled, DEFAULT_COFOUNDER_MODE_CONFIG.overnightWindow.enabled),
      timezone: coerceString(overnightWindow.timezone, DEFAULT_COFOUNDER_MODE_CONFIG.overnightWindow.timezone),
      start: coerceString(overnightWindow.start, DEFAULT_COFOUNDER_MODE_CONFIG.overnightWindow.start),
      end: coerceString(overnightWindow.end, DEFAULT_COFOUNDER_MODE_CONFIG.overnightWindow.end),
    },
    hardLimits: {
      spendCapUsdPerWindow: Math.max(0, coerceNumber(hardLimits.spendCapUsdPerWindow, DEFAULT_COFOUNDER_MODE_CONFIG.hardLimits.spendCapUsdPerWindow)),
      maxExternalMessages: Math.max(0, Math.floor(coerceNumber(hardLimits.maxExternalMessages, DEFAULT_COFOUNDER_MODE_CONFIG.hardLimits.maxExternalMessages))),
      maxLiveExperiments: Math.max(0, Math.floor(coerceNumber(hardLimits.maxLiveExperiments, DEFAULT_COFOUNDER_MODE_CONFIG.hardLimits.maxLiveExperiments))),
      allowProductionDeploys: coerceBoolean(hardLimits.allowProductionDeploys, DEFAULT_COFOUNDER_MODE_CONFIG.hardLimits.allowProductionDeploys),
    },
    actionPolicies: {
      allowedDomains: coerceStringArray(actionPolicies.allowedDomains, DEFAULT_COFOUNDER_MODE_CONFIG.actionPolicies.allowedDomains),
      blockedActionTypes: coerceStringArray(actionPolicies.blockedActionTypes, DEFAULT_COFOUNDER_MODE_CONFIG.actionPolicies.blockedActionTypes),
      requireApprovalActionTypes: coerceStringArray(actionPolicies.requireApprovalActionTypes, DEFAULT_COFOUNDER_MODE_CONFIG.actionPolicies.requireApprovalActionTypes),
    },
    trustGates: {
      minConfidenceToExecute: clamp(
        coerceNumber(trustGates.minConfidenceToExecute, DEFAULT_COFOUNDER_MODE_CONFIG.trustGates.minConfidenceToExecute),
        0,
        1
      ),
      minTrustScoreToRaiseAutonomy: clamp(
        coerceNumber(
          trustGates.minTrustScoreToRaiseAutonomy,
          DEFAULT_COFOUNDER_MODE_CONFIG.trustGates.minTrustScoreToRaiseAutonomy
        ),
        0,
        1
      ),
    },
    agents: normalizeAgents(root.agents, DEFAULT_COFOUNDER_MODE_CONFIG.agents),
    decisionEngine: {
      divergenceThreshold: clamp(coerceNumber(decisionEngine.divergenceThreshold, DEFAULT_COFOUNDER_MODE_CONFIG.decisionEngine.divergenceThreshold), 0, 1),
      tieBreaker: coerceString(decisionEngine.tieBreaker, DEFAULT_COFOUNDER_MODE_CONFIG.decisionEngine.tieBreaker) === 'highest_confidence'
        ? 'highest_confidence'
        : 'strategic_priority',
      strategicPriorityOrder: normalizeStrategicOrder(
        decisionEngine.strategicPriorityOrder,
        DEFAULT_COFOUNDER_MODE_CONFIG.decisionEngine.strategicPriorityOrder
      ),
      irreversibleActionTypes: coerceStringArray(
        decisionEngine.irreversibleActionTypes,
        DEFAULT_COFOUNDER_MODE_CONFIG.decisionEngine.irreversibleActionTypes
      ),
    },
    pivotalQuestions: {
      enabled: coerceBoolean(pivotalQuestions.enabled, DEFAULT_COFOUNDER_MODE_CONFIG.pivotalQuestions.enabled),
      cooldownMinutes: Math.max(0, Math.floor(coerceNumber(pivotalQuestions.cooldownMinutes, DEFAULT_COFOUNDER_MODE_CONFIG.pivotalQuestions.cooldownMinutes))),
      maxPivotalQuestionsPerDay: Math.max(0, Math.floor(coerceNumber(pivotalQuestions.maxPivotalQuestionsPerDay, DEFAULT_COFOUNDER_MODE_CONFIG.pivotalQuestions.maxPivotalQuestionsPerDay))),
      maxNotificationsPerHour: Math.max(0, Math.floor(coerceNumber(pivotalQuestions.maxNotificationsPerHour, DEFAULT_COFOUNDER_MODE_CONFIG.pivotalQuestions.maxNotificationsPerHour))),
      silentModeQueue: coerceBoolean(pivotalQuestions.silentModeQueue, DEFAULT_COFOUNDER_MODE_CONFIG.pivotalQuestions.silentModeQueue),
      triggerRules: coerceStringArray(pivotalQuestions.triggerRules, DEFAULT_COFOUNDER_MODE_CONFIG.pivotalQuestions.triggerRules),
    },
    initiatives: {
      enabled: coerceBoolean(initiatives.enabled, DEFAULT_COFOUNDER_MODE_CONFIG.initiatives.enabled),
      maxActive: Math.max(1, Math.floor(coerceNumber(initiatives.maxActive, DEFAULT_COFOUNDER_MODE_CONFIG.initiatives.maxActive))),
      staleThresholdHours: Math.max(1, Math.floor(coerceNumber(initiatives.staleThresholdHours, DEFAULT_COFOUNDER_MODE_CONFIG.initiatives.staleThresholdHours))),
      wipLimits: {
        ...DEFAULT_COFOUNDER_MODE_CONFIG.initiatives.wipLimits,
        ...toRecord(initiatives.wipLimits),
      } as Record<string, number>,
      dailyCheckpointHourLocal: clamp(
        Math.floor(coerceNumber(initiatives.dailyCheckpointHourLocal, DEFAULT_COFOUNDER_MODE_CONFIG.initiatives.dailyCheckpointHourLocal)),
        0,
        23
      ),
      weeklyTriageDayLocal: clamp(
        Math.floor(coerceNumber(initiatives.weeklyTriageDayLocal, DEFAULT_COFOUNDER_MODE_CONFIG.initiatives.weeklyTriageDayLocal)),
        0,
        6
      ),
    },
    proactiveScanning: {
      enabled: coerceBoolean(proactiveScanning.enabled, DEFAULT_COFOUNDER_MODE_CONFIG.proactiveScanning.enabled),
      cadences: {
        trends: coerceString(proactiveScanning.cadences && toRecord(proactiveScanning.cadences).trends, DEFAULT_COFOUNDER_MODE_CONFIG.proactiveScanning.cadences.trends) as CoFounderModeConfigV1['proactiveScanning']['cadences']['trends'],
        opportunities: coerceString(proactiveScanning.cadences && toRecord(proactiveScanning.cadences).opportunities, DEFAULT_COFOUNDER_MODE_CONFIG.proactiveScanning.cadences.opportunities) as CoFounderModeConfigV1['proactiveScanning']['cadences']['opportunities'],
        experiments: coerceString(proactiveScanning.cadences && toRecord(proactiveScanning.cadences).experiments, DEFAULT_COFOUNDER_MODE_CONFIG.proactiveScanning.cadences.experiments) as CoFounderModeConfigV1['proactiveScanning']['cadences']['experiments'],
      },
      rankingFactors: {
        impactWeight: clamp(coerceNumber(toRecord(proactiveScanning.rankingFactors).impactWeight, DEFAULT_COFOUNDER_MODE_CONFIG.proactiveScanning.rankingFactors.impactWeight), 0, 1),
        confidenceWeight: clamp(coerceNumber(toRecord(proactiveScanning.rankingFactors).confidenceWeight, DEFAULT_COFOUNDER_MODE_CONFIG.proactiveScanning.rankingFactors.confidenceWeight), 0, 1),
        effortWeight: clamp(coerceNumber(toRecord(proactiveScanning.rankingFactors).effortWeight, DEFAULT_COFOUNDER_MODE_CONFIG.proactiveScanning.rankingFactors.effortWeight), 0, 1),
        urgencyWeight: clamp(coerceNumber(toRecord(proactiveScanning.rankingFactors).urgencyWeight, DEFAULT_COFOUNDER_MODE_CONFIG.proactiveScanning.rankingFactors.urgencyWeight), 0, 1),
      },
    },
    riskSynthesis: {
      enabled: coerceBoolean(riskSynthesis.enabled, DEFAULT_COFOUNDER_MODE_CONFIG.riskSynthesis.enabled),
      correlationWeight: clamp(coerceNumber(riskSynthesis.correlationWeight, DEFAULT_COFOUNDER_MODE_CONFIG.riskSynthesis.correlationWeight), 0, 1),
      thresholds: {
        low: clamp(coerceNumber(toRecord(riskSynthesis.thresholds).low, DEFAULT_COFOUNDER_MODE_CONFIG.riskSynthesis.thresholds.low), 0, 1),
        medium: clamp(coerceNumber(toRecord(riskSynthesis.thresholds).medium, DEFAULT_COFOUNDER_MODE_CONFIG.riskSynthesis.thresholds.medium), 0, 1),
        high: clamp(coerceNumber(toRecord(riskSynthesis.thresholds).high, DEFAULT_COFOUNDER_MODE_CONFIG.riskSynthesis.thresholds.high), 0, 1),
        critical: clamp(coerceNumber(toRecord(riskSynthesis.thresholds).critical, DEFAULT_COFOUNDER_MODE_CONFIG.riskSynthesis.thresholds.critical), 0, 1),
      },
    },
    learningRoi: {
      enabled: coerceBoolean(learningRoi.enabled, DEFAULT_COFOUNDER_MODE_CONFIG.learningRoi.enabled),
      monthlyRollupDay: clamp(
        Math.floor(coerceNumber(learningRoi.monthlyRollupDay, DEFAULT_COFOUNDER_MODE_CONFIG.learningRoi.monthlyRollupDay)),
        1,
        28
      ),
    },
    integrations: normalizeIntegrations(root.integrations, DEFAULT_COFOUNDER_MODE_CONFIG.integrations),
    auditArtifacts: {
      decisionAudit: coerceBoolean(auditArtifacts.decisionAudit, DEFAULT_COFOUNDER_MODE_CONFIG.auditArtifacts.decisionAudit),
      errorAudit: coerceBoolean(auditArtifacts.errorAudit, DEFAULT_COFOUNDER_MODE_CONFIG.auditArtifacts.errorAudit),
      decisionsHistory: coerceBoolean(auditArtifacts.decisionsHistory, DEFAULT_COFOUNDER_MODE_CONFIG.auditArtifacts.decisionsHistory),
      runtimeState: coerceBoolean(auditArtifacts.runtimeState, DEFAULT_COFOUNDER_MODE_CONFIG.auditArtifacts.runtimeState),
      redactFields: coerceStringArray(auditArtifacts.redactFields, DEFAULT_COFOUNDER_MODE_CONFIG.auditArtifacts.redactFields),
    },
  }

  if (!TIME_RE.test(config.overnightWindow.start)) {
    issues.push('overnightWindow.start must be HH:mm')
    config.overnightWindow.start = DEFAULT_COFOUNDER_MODE_CONFIG.overnightWindow.start
  }

  if (!TIME_RE.test(config.overnightWindow.end)) {
    issues.push('overnightWindow.end must be HH:mm')
    config.overnightWindow.end = DEFAULT_COFOUNDER_MODE_CONFIG.overnightWindow.end
  }

  const thresholdOrderIsInvalid =
    config.riskSynthesis.thresholds.low > config.riskSynthesis.thresholds.medium ||
    config.riskSynthesis.thresholds.medium > config.riskSynthesis.thresholds.high ||
    config.riskSynthesis.thresholds.high > config.riskSynthesis.thresholds.critical

  if (thresholdOrderIsInvalid) {
    issues.push('riskSynthesis.thresholds must be ordered low <= medium <= high <= critical')
    config.riskSynthesis.thresholds = { ...DEFAULT_COFOUNDER_MODE_CONFIG.riskSynthesis.thresholds }
  }

  const rankWeightSum =
    config.proactiveScanning.rankingFactors.impactWeight +
    config.proactiveScanning.rankingFactors.confidenceWeight +
    config.proactiveScanning.rankingFactors.effortWeight +
    config.proactiveScanning.rankingFactors.urgencyWeight

  if (rankWeightSum <= 0) {
    issues.push('proactiveScanning.rankingFactors must have positive total weight')
    config.proactiveScanning.rankingFactors = {
      ...DEFAULT_COFOUNDER_MODE_CONFIG.proactiveScanning.rankingFactors,
    }
  }

  return { config, issues }
}
