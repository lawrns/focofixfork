import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { authRequiredResponse, forbiddenResponse } from '@/lib/api/response-helpers'
import { supabaseAdmin } from '@/lib/supabase-server'
import { n8nRequest } from '@/lib/n8n/client'
import { canActivateWorkflow } from '@/lib/n8n/governance'
import { getProjectAccess } from '@/lib/projects/access'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ id: string; workflowId: string }>
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { user, supabase, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  const { id: projectId, workflowId } = await params
  const access = await getProjectAccess(projectId, user, supabase)
  if (!access) return mergeAuthResponse(forbiddenResponse('You do not have access to this project'), authResponse)
  if (!access.canReview) return mergeAuthResponse(forbiddenResponse('Only project reviewers can activate workflows'), authResponse)

  const { data: job } = await supabaseAdmin
    .from('automation_jobs')
    .select('id, policy, metadata')
    .eq('project_id', projectId)
    .eq('external_id', workflowId)
    .maybeSingle()

  if (!job) return mergeAuthResponse(NextResponse.json({ ok: false, error: { message: 'Workflow not found for project' } }, { status: 404 }), authResponse)

  const decision = canActivateWorkflow({
    ownerAgent: job.metadata?.owner_agent,
    riskTier: job.policy?.risk_tier,
  })
  if (!decision.allowed) return mergeAuthResponse(NextResponse.json({ ok: false, error: { message: decision.reason } }, { status: 400 }), authResponse)

  try {
    const workflow = await n8nRequest(`/api/v1/workflows/${encodeURIComponent(workflowId)}/activate`, { method: 'POST', body: {} })
    await supabaseAdmin
      .from('automation_jobs')
      .update({ enabled: true, last_status: 'running', updated_at: new Date().toISOString() })
      .eq('id', job.id)

    return mergeAuthResponse(NextResponse.json({ ok: true, data: { workflow } }), authResponse)
  } catch (routeError) {
    const message = routeError instanceof Error ? routeError.message : 'Failed to activate workflow'
    return mergeAuthResponse(NextResponse.json({ ok: false, error: { message } }, { status: 500 }), authResponse)
  }
}
