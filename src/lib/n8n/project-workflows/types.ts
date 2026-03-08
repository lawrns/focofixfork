import type { N8nWorkflowTemplate } from '@/lib/n8n/templates/types'

export type ProjectWorkflowRiskTier = 'low' | 'medium' | 'high'
export type ProjectWorkflowProposalStatus = 'draft' | 'approved' | 'rejected' | 'activated' | 'archived'
export type WorkflowAugmentationId = 'wait_backoff' | 'payload_snapshot' | 'callback_audit'

export type WorkflowAugmentation = {
  id: WorkflowAugmentationId
  title: string
  description: string
  category: 'control' | 'quality' | 'callback'
}

export type WorkflowProposalRecord = {
  id: string
  workspace_id: string
  project_id: string
  status: ProjectWorkflowProposalStatus
  source_template_id: string
  owner_agent: string
  risk_tier: ProjectWorkflowRiskTier
  summary: string
  trigger_label: string
  step_labels: string[]
  external_effects: string[]
  workflow_json: Record<string, unknown>
  suggested_add_ons: WorkflowAugmentation[]
  selected_add_ons: WorkflowAugmentation[]
  metadata: Record<string, unknown>
  approver_id: string | null
  approved_at: string | null
  rejected_at: string | null
  rejection_reason: string | null
  n8n_workflow_id: string | null
  automation_job_id: string | null
  created_at: string
  updated_at: string
}

export type WorkflowProposalDraft = {
  sourceTemplate: N8nWorkflowTemplate
  ownerAgent: string
  riskTier: ProjectWorkflowRiskTier
  summary: string
  triggerLabel: string
  stepLabels: string[]
  externalEffects: string[]
  suggestedAddOns: WorkflowAugmentation[]
  workflowJson: Record<string, unknown>
  metadata: Record<string, unknown>
}

export type ProjectWorkflowLiveItem = {
  id: string
  workflow_id: string
  name: string
  enabled: boolean
  job_type: string
  risk_tier: ProjectWorkflowRiskTier
  owner_agent: string
  proposal_id: string | null
  project_id: string
  workspace_id: string
  last_status: string | null
  last_run_at: string | null
  next_run_at: string | null
  recent_failures: number
  n8n_url: string | null
  updated_at: string
}
