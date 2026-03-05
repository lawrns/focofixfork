import type { PlanningAgentDescriptor } from './agent-planning'

export interface ProblemFrame {
  user_request: string
  decision_to_make: string
  desired_outcome: string
  constraints: string[]
  assumptions: string[]
}

export interface AgentPerspective {
  agent_name: string
  role: string
  perspective: string
  recommendation: string
  reasoning: string[]
  concerns: string[]
  confidence: 'low' | 'medium' | 'high'
}

export interface AgentChallenge {
  from_agent: string
  to_agent: string
  challenge: string
  why_it_matters: string
}

export interface AgentRevision {
  agent_name: string
  revision: string
}

export interface ConsolidatedAnswer {
  recommendation: string
  why_this_path_wins: string[]
  points_of_agreement: string[]
  remaining_disagreements: string[]
  uncertainties: string[]
  validation_needed: string[]
}

export interface ExecutionPlanStep {
  order: number
  action: string
  owner: string
  dependencies: string[]
  output: string
}

export interface ExecutionPlanRisk {
  risk: string
  impact: 'low' | 'medium' | 'high'
  mitigation: string
}

export interface PlanResult {
  summary: string
  steps: string[]
  files_to_modify: string[]
  risks: string[]
  db_implications: string[]
  validation_strategy: string
  estimated_complexity: 'low' | 'medium' | 'high'
  problem_frame?: ProblemFrame
  selected_agents?: PlanningAgentDescriptor[]
  agent_perspectives?: AgentPerspective[]
  agent_debate?: {
    challenges: AgentChallenge[]
    revisions: AgentRevision[]
    unresolved_disagreements: string[]
  }
  consolidated_answer?: ConsolidatedAnswer
  execution_plan?: {
    objective: string
    recommended_approach: string
    steps: ExecutionPlanStep[]
    risks: ExecutionPlanRisk[]
    open_questions: string[]
    success_criteria: string[]
    immediate_next_actions: string[]
  }
}

export interface ExecutionResult {
  summary: string
  patches: Array<{ file: string; diff: string; description: string }>
  commands_suggested: string[]
  warnings: string[]
  notes: string
}

export interface ReviewReport {
  summary: string
  critical_issues: string[]
  risks: string[]
  improvements: string[]
  performance: string[]
  security: string[]
  db_observations: string[]
  suggested_patches: Array<{ file: string; change: string }>
  handbook_additions: Array<{ pattern: string; lesson: string; applicable_to: string }>
  confidence_score: number // 0–100
}

export type PipelineStatus = 'planning' | 'executing' | 'reviewing' | 'complete' | 'failed' | 'cancelled'

export interface PipelineRun {
  id: string
  task_description: string
  planner_model: string
  executor_model: string
  reviewer_model: string | null
  routing_profile_id?: string | null
  provider_chain?: string[]
  plan_model_actual?: string | null
  execute_model_actual?: string | null
  review_model_actual?: string | null
  fallbacks_triggered?: unknown[]
  status: PipelineStatus
  plan_result: PlanResult | null
  execution_result: ExecutionResult | null
  review_result: ReviewReport | null
  files_changed: string[]
  db_changes: boolean
  handbook_ref: string | null
  auto_reviewed: boolean
  planner_run_id: string | null
  executor_run_id: string | null
  reviewer_run_id: string | null
  // Token tracking
  started_at: string | null
  planner_tokens_in: number
  planner_tokens_out: number
  executor_tokens_in: number
  executor_tokens_out: number
  reviewer_tokens_in: number
  reviewer_tokens_out: number
  total_cost_usd: number
  planner_ttft_ms: number | null
  planner_elapsed_ms: number | null
  executor_elapsed_ms: number | null
  reviewer_elapsed_ms: number | null
  created_at: string
  updated_at: string
}

// ── SSE Streaming Protocol ──────────────────────────────────────────────────

export type PipelineSSEEvent =
  | { type: 'run_start'; run_id: string; started_at: number }
  | { type: 'phase_start'; phase: PipelinePhase; model: string }
  | { type: 'text_delta'; phase: PipelinePhase; text: string }
  | { type: 'ttft'; phase: PipelinePhase; ms: number }
  | { type: 'usage'; phase: PipelinePhase; input_tokens: number; output_tokens: number; cost_usd: number; model: string }
  | { type: 'phase_complete'; phase: PipelinePhase; elapsed_ms: number; result?: unknown }
  | { type: 'phase_error'; phase: PipelinePhase; message: string }
  | { type: 'activity'; phase: PipelinePhase | 'system'; message: string }
  | { type: 'pipeline_complete'; run_id: string; total_elapsed_ms: number }
  | { type: 'pipeline_error'; message: string }

export type PipelinePhase = 'plan' | 'execute' | 'review'

// Model hint names passed to ClawdBot routing
export const PLANNER_MODELS = [
  { label: 'Claude Opus 4.6', value: 'claude-opus-4-6' },
] as const

export const EXECUTOR_MODELS = [
  { label: 'Kimi K2.5 Standard', value: 'kimi-k2-standard' },
  { label: 'Kimi K2.5 Fast', value: 'kimi-k2-fast' },
  { label: 'Kimi K2.5 Max', value: 'kimi-k2-max' },
] as const

export const REVIEWER_MODELS = [
  { label: 'Codex Standard', value: 'codex-standard' },
  { label: 'Codex Lite', value: 'codex-lite' },
  { label: 'Codex Pro', value: 'codex-pro' },
  { label: 'Codex Max', value: 'codex-max' },
] as const
