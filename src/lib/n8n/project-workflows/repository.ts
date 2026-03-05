import { supabaseAdmin } from '@/lib/supabase-server'
import type {
  ProjectWorkflowLiveItem,
  WorkflowAugmentation,
  WorkflowProposalDraft,
  WorkflowProposalRecord,
} from './types'

function serializeAddOns(addOns: WorkflowAugmentation[]) {
  return addOns.map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    category: item.category,
  }))
}

function mapProposal(row: any): WorkflowProposalRecord {
  return {
    id: row.id,
    workspace_id: row.workspace_id,
    project_id: row.project_id,
    status: row.status,
    source_template_id: row.source_template_id,
    owner_agent: row.owner_agent,
    risk_tier: row.risk_tier,
    summary: row.summary,
    trigger_label: row.trigger_label,
    step_labels: row.step_labels ?? [],
    external_effects: row.external_effects ?? [],
    workflow_json: row.workflow_json ?? {},
    suggested_add_ons: row.suggested_add_ons ?? [],
    selected_add_ons: row.selected_add_ons ?? [],
    metadata: row.metadata ?? {},
    approver_id: row.approver_id ?? null,
    approved_at: row.approved_at ?? null,
    rejected_at: row.rejected_at ?? null,
    rejection_reason: row.rejection_reason ?? null,
    n8n_workflow_id: row.n8n_workflow_id ?? null,
    automation_job_id: row.automation_job_id ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

export async function listWorkflowProposals(projectId: string): Promise<WorkflowProposalRecord[]> {
  const { data, error } = await supabaseAdmin
    .from('project_workflow_proposals')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []).map(mapProposal)
}

export async function insertWorkflowProposals(
  projectId: string,
  workspaceId: string,
  drafts: WorkflowProposalDraft[],
): Promise<WorkflowProposalRecord[]> {
  const rows = drafts.map((draft) => ({
    project_id: projectId,
    workspace_id: workspaceId,
    status: 'draft',
    source_template_id: draft.sourceTemplate.id,
    owner_agent: draft.ownerAgent,
    risk_tier: draft.riskTier,
    summary: draft.summary,
    trigger_label: draft.triggerLabel,
    step_labels: draft.stepLabels,
    external_effects: draft.externalEffects,
    workflow_json: draft.workflowJson,
    suggested_add_ons: serializeAddOns(draft.suggestedAddOns),
    selected_add_ons: [],
    metadata: draft.metadata,
  }))

  const { data, error } = await supabaseAdmin
    .from('project_workflow_proposals')
    .insert(rows)
    .select('*')

  if (error) throw error
  return (data ?? []).map(mapProposal)
}

export async function getWorkflowProposal(projectId: string, proposalId: string): Promise<WorkflowProposalRecord | null> {
  const { data, error } = await supabaseAdmin
    .from('project_workflow_proposals')
    .select('*')
    .eq('project_id', projectId)
    .eq('id', proposalId)
    .maybeSingle()

  if (error) throw error
  return data ? mapProposal(data) : null
}

export async function updateWorkflowProposal(proposalId: string, patch: Record<string, unknown>): Promise<WorkflowProposalRecord> {
  const { data, error } = await supabaseAdmin
    .from('project_workflow_proposals')
    .update(patch)
    .eq('id', proposalId)
    .select('*')
    .single()

  if (error) throw error
  return mapProposal(data)
}

export async function listProjectWorkflows(projectId: string): Promise<ProjectWorkflowLiveItem[]> {
  const { data, error } = await supabaseAdmin
    .from('automation_jobs')
    .select('id, external_id, name, enabled, job_type, policy, project_id, workspace_id, last_status, last_run_at, next_run_at, metadata, updated_at')
    .eq('project_id', projectId)
    .order('updated_at', { ascending: false })

  if (error) throw error
  const jobs = data ?? []

  const jobIds = jobs.map((job: any) => job.id)
  const failureCounts = new Map<string, number>()
  if (jobIds.length > 0) {
    const { data: runs } = await supabaseAdmin
      .from('automation_runs')
      .select('job_id, status')
      .in('job_id', jobIds)
      .eq('status', 'failed')

    for (const run of runs ?? []) {
      const count = failureCounts.get(run.job_id) ?? 0
      failureCounts.set(run.job_id, count + 1)
    }
  }

  return jobs.map((job: any) => ({
    id: job.id,
    workflow_id: job.external_id ?? '',
    name: job.name,
    enabled: job.enabled,
    job_type: job.job_type,
    risk_tier: (job.policy?.risk_tier ?? 'low') as ProjectWorkflowLiveItem['risk_tier'],
    owner_agent: String(job.metadata?.owner_agent ?? 'Unknown'),
    proposal_id: typeof job.metadata?.proposal_id === 'string' ? job.metadata.proposal_id : null,
    project_id: job.project_id,
    workspace_id: job.workspace_id,
    last_status: job.last_status ?? null,
    last_run_at: job.last_run_at ?? null,
    next_run_at: job.next_run_at ?? null,
    recent_failures: failureCounts.get(job.id) ?? 0,
    n8n_url: job.external_id ? `/empire/n8n/workflows/${job.external_id}` : null,
    updated_at: job.updated_at,
  }))
}

export async function listEmpireProjectWorkflows(workspaceIds: string[]): Promise<Array<ProjectWorkflowLiveItem & { project_name: string | null; project_slug: string | null }>> {
  const { data, error } = await supabaseAdmin
    .from('automation_jobs')
    .select('id, external_id, name, enabled, job_type, policy, project_id, workspace_id, last_status, last_run_at, next_run_at, metadata, updated_at, foco_projects(name, slug)')
    .in('workspace_id', workspaceIds)
    .not('project_id', 'is', null)
    .order('updated_at', { ascending: false })

  if (error) throw error
  return (data ?? []).map((job: any) => ({
    id: job.id,
    workflow_id: job.external_id ?? '',
    name: job.name,
    enabled: job.enabled,
    job_type: job.job_type,
    risk_tier: (job.policy?.risk_tier ?? 'low') as ProjectWorkflowLiveItem['risk_tier'],
    owner_agent: String(job.metadata?.owner_agent ?? 'Unknown'),
    proposal_id: typeof job.metadata?.proposal_id === 'string' ? job.metadata.proposal_id : null,
    project_id: job.project_id,
    workspace_id: job.workspace_id,
    last_status: job.last_status ?? null,
    last_run_at: job.last_run_at ?? null,
    next_run_at: job.next_run_at ?? null,
    recent_failures: 0,
    n8n_url: job.external_id ? `/empire/n8n/workflows/${job.external_id}` : null,
    updated_at: job.updated_at,
    project_name: Array.isArray(job.foco_projects) ? job.foco_projects[0]?.name ?? null : job.foco_projects?.name ?? null,
    project_slug: Array.isArray(job.foco_projects) ? job.foco_projects[0]?.slug ?? null : job.foco_projects?.slug ?? null,
  }))
}
