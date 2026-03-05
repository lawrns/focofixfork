export const AGENT_LANES = ['product_ui', 'platform_api', 'requirements'] as const
export type AgentLane = typeof AGENT_LANES[number]

export const TASK_STATUSES = ['draft', 'approved', 'in_progress', 'blocked', 'done', 'archived'] as const
export type AgentOpsTaskStatus = typeof TASK_STATUSES[number]

export const MESSAGE_STATUSES = ['open', 'resolved', 'archived'] as const
export type AgentOpsMessageStatus = typeof MESSAGE_STATUSES[number]

export const TASK_SIZES = ['micro', 'small', 'medium'] as const
export type AgentOpsTaskSize = typeof TASK_SIZES[number]

export const APPROVAL_SENSITIVITY = ['low', 'medium', 'high'] as const
export type ApprovalSensitivity = typeof APPROVAL_SENSITIVITY[number]

export interface AgentOpsTaskRow {
  id: string
  user_id: string
  workspace_id: string | null
  project_id: string | null
  lane: AgentLane
  title: string
  objective: string
  acceptance_criteria: string[]
  size: AgentOpsTaskSize
  status: AgentOpsTaskStatus
  approved_by: string | null
  approved_at: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface AgentOpsMessageRow {
  id: string
  user_id: string
  workspace_id: string | null
  task_id: string | null
  from_lane: AgentLane
  to_lane: AgentLane
  subject: string
  body: string
  status: AgentOpsMessageStatus
  resolved_by: string | null
  resolved_at: string | null
  created_at: string
  updated_at: string
}

export interface AgentOpsDecisionRow {
  id: string
  user_id: string
  workspace_id: string | null
  task_id: string | null
  title: string
  decision: string
  rationale: string
  created_at: string
}

export interface CustomAgentProfileRow {
  id: string
  user_id: string
  workspace_id: string | null
  name: string
  slug: string
  lane: AgentLane
  description: string | null
  system_prompt: string
  tool_access: Record<string, unknown>
  write_scope: string[]
  read_scope: string[]
  approval_sensitivity: ApprovalSensitivity
  avatar_url: string | null
  persona_tags: string[]
  active: boolean
  created_at: string
  updated_at: string
}
