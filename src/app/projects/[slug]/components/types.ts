export interface Project {
  id: string;
  name: string;
  slug: string;
  owner_id?: string | null;
  description?: string;
  brief?: string;
  color?: string;
  workspace_id: string;
  delegation_settings?: {
    enabled?: boolean;
    auto_queue_agent_tasks?: boolean;
    require_human_approval_for_delegation?: boolean;
    verification_required_before_done?: boolean;
  };
}

export interface TeamMember {
  id: string;
  user_id: string;
  role: string;
  user_profiles?: {
    full_name?: string;
    email: string;
  };
}

export interface ProjectWorkflowAddOn {
  id: string;
  title: string;
  description: string;
  category: string;
}

export interface ProjectWorkflowProposal {
  id: string;
  status: 'draft' | 'approved' | 'rejected' | 'activated' | 'archived';
  source_template_id: string;
  owner_agent: string;
  risk_tier: 'low' | 'medium' | 'high';
  summary: string;
  trigger_label: string;
  step_labels: string[];
  external_effects: string[];
  suggested_add_ons: ProjectWorkflowAddOn[];
  selected_add_ons: ProjectWorkflowAddOn[];
  created_at: string;
  rejected_at?: string | null;
  rejection_reason?: string | null;
}

export interface ProjectWorkflowLiveItem {
  id: string;
  workflow_id: string;
  name: string;
  enabled: boolean;
  job_type: string;
  risk_tier: 'low' | 'medium' | 'high';
  owner_agent: string;
  proposal_id?: string | null;
  last_status?: string | null;
  last_run_at?: string | null;
  next_run_at?: string | null;
  recent_failures: number;
  updated_at: string;
}

export interface ProjectDelegationQueueItem {
  id: string;
  title: string;
  status: string;
  priority: string | null;
  delegation_status: string | null;
  assigned_agent: string | null;
  run_id: string | null;
  position: string | number | null;
  created_at: string;
  updated_at: string;
  ready: boolean;
  blocker_count: number;
  blockers: Array<{
    id: string;
    title: string;
    status: string | null;
  }>;
}
