export type AutonomyTier = 'off' | 'advisor' | 'bounded' | 'near_full'
export type PoeOutcome = 'success' | 'failure' | 'partial' | 'cancelled'
export type AgentBackend = 'crico' | 'clawdbot' | 'bosun' | 'openclaw' | 'custom'

export interface Agent {
  id: string
  workspace_id: string
  backend: AgentBackend
  agent_key: string
  display_name: string
  slug: string
  description: string | null
  public_profile: boolean
  autonomy_tier: AutonomyTier
  created_at: string
  updated_at: string
}

export interface AgentTrustScore {
  id: string
  agent_id: string
  workspace_id: string
  score: number
  total_iterations: number
  successful_iterations: number
  failed_iterations: number
  cancelled_iterations: number
  avg_duration_ms: number | null
  last_iteration_at: string | null
  revenue_correlation: number
  score_history: Array<{ score: number; timestamp: string }>
  created_at: string
  updated_at: string
}

export interface AgentPoeAnchor {
  id: string
  agent_id: string
  workspace_id: string
  session_id: string | null
  run_id: string | null
  ledger_event_id: string | null
  ledger_hash: string | null
  outcome: PoeOutcome
  input_hash: string | null
  output_hash: string | null
  duration_ms: number | null
  score_delta: number | null
  score_after: number | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface RevenueAttribution {
  id: string
  agent_id: string
  workspace_id: string
  poe_anchor_id: string | null
  amount_cents: number
  currency: string
  stripe_event_id: string | null
  description: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface AutonomyGraduationLogEntry {
  id: string
  agent_id: string
  workspace_id: string
  previous_tier: AutonomyTier
  new_tier: AutonomyTier
  trigger_reason: string
  trust_score_at_change: number
  triggered_by: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface AgentReputationProfile {
  agent: Agent
  trust_score: AgentTrustScore
  recent_anchors: AgentPoeAnchor[]
  graduations: AutonomyGraduationLogEntry[]
  revenue_total_cents: number
}
