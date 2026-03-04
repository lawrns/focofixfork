export type AutonomyMode = 'off' | 'advisor' | 'bounded' | 'near_full'

export type AutonomyProfile = 'advisor_first' | 'bounded_operator' | 'revenue_only' | 'near_full'

export interface OvernightWindow {
  enabled: boolean
  timezone: string
  start: string // HH:mm
  end: string // HH:mm
}

export interface HardLimits {
  spendCapUsdPerWindow: number
  maxExternalMessages: number
  maxLiveExperiments: number
  allowProductionDeploys: boolean
}

export interface ActionPolicies {
  allowedDomains: string[]
  blockedActionTypes: string[]
  requireApprovalActionTypes: string[]
}

export interface TrustGates {
  minConfidenceToExecute: number
  minTrustScoreToRaiseAutonomy: number
}

export interface CoFounderPolicy {
  mode: AutonomyMode
  profile: AutonomyProfile
  overnightWindow: OvernightWindow
  hardLimits: HardLimits
  actionPolicies: ActionPolicies
  trustGates: TrustGates
}

export interface CoFounderValidateActionInput {
  actionType: string
  domain: string
  estimatedSpendUsd?: number
  confidence?: number
  externalMessageCount?: number
  liveExperimentCount?: number
  productionImpact?: boolean
  irreversible?: boolean
}

export interface CoFounderValidateActionResult {
  allowed: boolean
  requiresApproval: boolean
  reasons: string[]
  violatedRules: string[]
  effectiveMode: AutonomyMode
}
