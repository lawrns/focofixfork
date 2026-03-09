import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { authRequiredResponse, forbiddenResponse, notFoundResponse } from '@/lib/api/response-helpers'
import { supabaseAdmin } from '@/lib/supabase-server'
import { getProjectAccess } from '@/lib/projects/access'
import { ALLOWED_AUGMENTATIONS, getWorkflowProposal, updateWorkflowProposal, createDraftWorkflowFromProposal } from '@/lib/n8n/project-workflows'
import { getWorkflowTemplateById } from '@/lib/n8n/templates/registry'
import { canActivateWorkflow } from '@/lib/n8n/governance'
import { n8nRequest } from '@/lib/n8n/client'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ id: string; proposalId: string }>
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { user, supabase, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  const { id: projectId, proposalId } = await params
  const access = await getProjectAccess(projectId, user, supabase)
  if (!access) return mergeAuthResponse(forbiddenResponse('You do not have access to this project'), authResponse)
  if (!access.canReview) return mergeAuthResponse(forbiddenResponse('Only project reviewers can approve workflows'), authResponse)

  try {
    const proposal = await getWorkflowProposal(projectId, proposalId)
    if (!proposal) return mergeAuthResponse(notFoundResponse('Workflow proposal', proposalId), authResponse)

    const template = getWorkflowTemplateById(proposal.source_template_id)
    if (!template) {
      return mergeAuthResponse(NextResponse.json({ ok: false, error: { message: 'Template no longer exists' } }, { status: 400 }), authResponse)
    }

    const body = await req.json().catch(() => ({}))
    const requestedIds = Array.isArray(body?.selected_add_ons) ? body.selected_add_ons : proposal.suggested_add_ons.map((item) => item.id)
    const selectedAddOns = ALLOWED_AUGMENTATIONS.filter((item) => requestedIds.includes(item.id))
    const created = await createDraftWorkflowFromProposal({
      sourceTemplate: template,
      ownerAgent: proposal.owner_agent,
      riskTier: proposal.risk_tier,
      summary: proposal.summary,
      triggerLabel: proposal.trigger_label,
      stepLabels: proposal.step_labels,
      externalEffects: proposal.external_effects,
      suggestedAddOns: proposal.suggested_add_ons,
      workflowJson: proposal.workflow_json,
      metadata: proposal.metadata,
    }, selectedAddOns)

    const workflowId = String(created.id ?? '')
    const { data: job } = await supabaseAdmin
      .from('automation_jobs')
      .upsert({
        external_id: workflowId,
        name: String(created.name ?? `${access.project.name} workflow`),
        description: proposal.summary,
        job_type: template.trigger_type === 'cron' ? 'cron' : 'event_triggered',
        enabled: false,
        handler: `n8n.workflow.${workflowId}`,
        payload: {},
        policy: {
          draft_first: true,
          risk_tier: proposal.risk_tier,
          proposal_id: proposal.id,
        },
        workspace_id: proposal.workspace_id,
        project_id: proposal.project_id,
        metadata: {
          owner_agent: proposal.owner_agent,
          source: 'project_workflow_proposal',
          template_id: proposal.source_template_id,
          proposal_id: proposal.id,
        },
        last_status: 'pending',
      }, { onConflict: 'external_id' })
      .select('id')
      .single()

    const decision = canActivateWorkflow({
      ownerAgent: proposal.owner_agent,
      riskTier: proposal.risk_tier,
    })

    let activatedWorkflow: Record<string, unknown> | null = null
    if (decision.allowed && workflowId) {
      activatedWorkflow = await n8nRequest(`/api/v1/workflows/${encodeURIComponent(workflowId)}/activate`, {
        method: 'POST',
        body: {},
      })
      await supabaseAdmin
        .from('automation_jobs')
        .update({ enabled: true, last_status: 'running', updated_at: new Date().toISOString() })
        .eq('external_id', workflowId)
    }

    const updated = await updateWorkflowProposal(proposal.id, {
      status: decision.allowed ? 'activated' : 'approved',
      approver_id: user.id,
      approved_at: new Date().toISOString(),
      selected_add_ons: selectedAddOns,
      n8n_workflow_id: workflowId,
      automation_job_id: job?.id ?? null,
    })

    return mergeAuthResponse(NextResponse.json({
      ok: true,
      data: {
        proposal: updated,
        workflow: activatedWorkflow ?? created,
        activated: Boolean(activatedWorkflow),
      },
    }), authResponse)
  } catch (routeError) {
    const message = routeError instanceof Error ? routeError.message : 'Failed to approve workflow proposal'
    return mergeAuthResponse(NextResponse.json({ ok: false, error: { message } }, { status: 500 }), authResponse)
  }
}
