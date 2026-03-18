import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { n8nRequest } from '@/lib/n8n/client'
import { canActivateWorkflow } from '@/lib/n8n/governance'
import { accessFailureResponse, requireProjectAccess } from '@/server/auth/access'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ id: string; workflowId: string }>
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { id: projectId, workflowId } = await params
  const access = await requireProjectAccess({ projectId, minimumRole: 'admin' })
  if (!access.ok) return accessFailureResponse(access)

  const { data: job } = await supabaseAdmin
    .from('automation_jobs')
    .select('id, policy, metadata')
    .eq('project_id', projectId)
    .eq('external_id', workflowId)
    .maybeSingle()

  if (!job) return NextResponse.json({ ok: false, error: { message: 'Workflow not found for project' } }, { status: 404 })

  const decision = canActivateWorkflow({
    ownerAgent: job.metadata?.owner_agent,
    riskTier: job.policy?.risk_tier,
  })
  if (!decision.allowed) return NextResponse.json({ ok: false, error: { message: decision.reason } }, { status: 400 })

  try {
    const workflow = await n8nRequest(`/api/v1/workflows/${encodeURIComponent(workflowId)}/activate`, { method: 'POST', body: {} })
    await supabaseAdmin
      .from('automation_jobs')
      .update({ enabled: true, last_status: 'running', updated_at: new Date().toISOString() })
      .eq('id', job.id)

    return NextResponse.json({ ok: true, data: { workflow } })
  } catch (routeError) {
    const message = routeError instanceof Error ? routeError.message : 'Failed to activate workflow'
    return NextResponse.json({ ok: false, error: { message } }, { status: 500 })
  }
}
