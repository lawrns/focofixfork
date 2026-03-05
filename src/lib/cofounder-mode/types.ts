export type CoFounderAutonomyMode = 'off' | 'advisor' | 'bounded' | 'near_full' | 'full_auto'

export type CoFounderProfile =
  | 'advisor_first'
  | 'bounded_operator'
  | 'revenue_only'
  | 'near_full'
  | 'full_auto'

export type StrategicPriority = 'revenue' | 'growth' | 'ops' | 'risk' | 'brand'

export type IntegrationAccessMode = 'read_only' | 'read_write' | 'approval_required'

export type PivotalDeliveryState = 'queued' | 'notified' | 'suppressed' | 'resolved' | 'expired'

export interface CoFounderAgentConfig {
  id: string
  label: string
  weight: number
  enabled: boolean
}

export interface CoFounderAgentVote {
  agentId: string
  approve: boolean
  confidence: number
  weight?: number
  rationale?: string
}

export interface CoFounderDecisionEngineConfig {
  divergenceThreshold: number
  tieBreaker: 'strategic_priority' | 'highest_confidence'
  strategicPriorityOrder: StrategicPriority[]
  irreversibleActionTypes: string[]
}

export interface CoFounderPivotalQuestionsConfig {
  enabled: boolean
  cooldownMinutes: number
  maxPivotalQuestionsPerDay: number
  maxNotificationsPerHour: number
  silentModeQueue: boolean
  triggerRules: string[]
}

export interface CoFounderInitiativesConfig {
  enabled: boolean
  maxActive: number
  staleThresholdHours: number
  wipLimits: Record<string, number>
  dailyCheckpointHourLocal: number
  weeklyTriageDayLocal: number
}

export interface CoFounderProactiveScanningConfig {
  enabled: boolean
  cadences: {
    trends: 'daily' | 'weekly'
    opportunities: 'weekly' | 'biweekly'
    experiments: 'monthly' | 'quarterly'
  }
  rankingFactors: {
    impactWeight: number
    confidenceWeight: number
    effortWeight: number
    urgencyWeight: number
  }
}

export interface CoFounderRiskSynthesisConfig {
  enabled: boolean
  correlationWeight: number
  thresholds: {
    low: number
    medium: number
    high: number
    critical: number
  }
}

export interface CoFounderLearningRoiConfig {
  enabled: boolean
  monthlyRollupDay: number
}

export interface CoFounderIntegrationPolicy {
  key: string
  access: IntegrationAccessMode
  allowReads: boolean
  allowWrites: boolean
  requiresApprovalForWrites: boolean
}

export interface CoFounderAuditArtifactsConfig {
  decisionAudit: boolean
  errorAudit: boolean
  decisionsHistory: boolean
  runtimeState: boolean
  redactFields: string[]
}

export interface CoFounderModeConfigV1 {
  version: 'v1'
  mode: CoFounderAutonomyMode
  profile: CoFounderProfile
  overnightWindow: {
    enabled: boolean
    timezone: string
    start: string
    end: string
  }
  hardLimits: {
    spendCapUsdPerWindow: number
    maxExternalMessages: number
    maxLiveExperiments: number
    allowProductionDeploys: boolean
  }
  actionPolicies: {
    allowedDomains: string[]
    blockedActionTypes: string[]
    requireApprovalActionTypes: string[]
  }
  trustGates: {
    minConfidenceToExecute: number
    minTrustScoreToRaiseAutonomy: number
  }
  agents: CoFounderAgentConfig[]
  decisionEngine: CoFounderDecisionEngineConfig
  pivotalQuestions: CoFounderPivotalQuestionsConfig
  initiatives: CoFounderInitiativesConfig
  proactiveScanning: CoFounderProactiveScanningConfig
  riskSynthesis: CoFounderRiskSynthesisConfig
  learningRoi: CoFounderLearningRoiConfig
  integrations: CoFounderIntegrationPolicy[]
  auditArtifacts: CoFounderAuditArtifactsConfig
}

export interface CoFounderActionValidationInput {
  actionType: string
  domain: string
  estimatedSpendUsd?: number
  confidence?: number
  externalMessageCount?: number
  liveExperimentCount?: number
  productionImpact?: boolean
  irreversible?: boolean
  trustScore?: number
  strategicPriority?: StrategicPriority
  integrationKey?: string
  actionKind?: 'read' | 'write'
  agentVotes?: CoFounderAgentVote[]
}

export interface CoFounderVoteBreakdown {
  agentId: string
  approve: boolean
  confidence: number
  effectiveWeight: number
}

export interface CoFounderDecisionMeta {
  weightedConfidence: number
  weightedApproval: number
  divergenceScore: number
  tieBrokenBy?: 'strategic_priority' | 'highest_confidence'
  resolution: 'execute' | 'approval_required' | 'blocked'
  voteBreakdown: CoFounderVoteBreakdown[]
}

export interface CoFounderDecisionResult {
  allowed: boolean
  requiresApproval: boolean
  reasons: string[]
  violatedRules: string[]
  effectiveMode: CoFounderAutonomyMode
  meta: CoFounderDecisionMeta
}

export interface CoFounderPivotalEvaluationInput {
  question: string
  workspaceId?: string | null
  priority?: 'low' | 'medium' | 'high' | 'critical'
  triggers?: string[]
  context?: Record<string, unknown>
  silentMode?: boolean
  now?: Date
}

export interface CoFounderPivotalWindowState {
  askedToday: number
  notifiedThisHour: number
  lastAskedAt?: string | null
  existingHashes?: string[]
}

export interface CoFounderPivotalEvaluationResult {
  shouldQueue: boolean
  shouldNotify: boolean
  deliveryState: PivotalDeliveryState
  reasonCodes: string[]
  dedupeHash: string
  matchedTriggers: string[]
}

export interface CoFounderInitiativeRecord {
  id: string
  title: string
  lane: string
  status: 'active' | 'paused' | 'completed' | 'cancelled'
  updatedAt: string
}

export interface CoFounderRiskSnapshotInput {
  technical: number
  market: number
  financial: number
  legal: number
}

export interface CoFounderRiskSnapshot {
  domainScores: CoFounderRiskSnapshotInput
  unifiedScore: number
  level: 'low' | 'medium' | 'high' | 'critical'
}

export interface CoFounderLearningEvent {
  accepted: boolean
  predictedCorrect: boolean
  estimatedMinutesSaved: number
  cycleHours: number
}

export interface CoFounderLearningRollup {
  acceptanceRate: number
  predictionAccuracy: number
  averageMinutesSaved: number
  decisionVelocityHours: number
  totalDecisions: number
}
