import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { authRequiredResponse, badRequestResponse, databaseErrorResponse } from '@/lib/api/response-helpers'
import { n8nRequest } from '@/lib/n8n/client'
import { canCreateOrUpdateWorkflow } from '@/lib/n8n/governance'
import { supabaseAdmin } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { user, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  try {
    const { searchParams } = new URL(req.url)
    const payload = await n8nRequest('/api/v1/workflows', {
      query: {
        limit: searchParams.get('limit') ?? 20,
        cursor: searchParams.get('cursor'),
        active: searchParams.get('active'),
        name: searchParams.get('name'),
        tags: searchParams.get('tags'),
      },
    })
    return NextResponse.json(payload)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to list workflows' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  const { user, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  const body = await req.json().catch(() => ({}))
  const workflow = body?.workflow
  if (!workflow || typeof workflow !== 'object') {
    return mergeAuthResponse(badRequestResponse('workflow object is required'), authResponse)
  }

  const governance = canCreateOrUpdateWorkflow({
    ownerAgent: body.owner_agent,
    riskTier: body.risk_tier,
    hasExternalMessaging: Boolean(body.has_external_messaging),
    hasFinancialAction: Boolean(body.has_financial_action),
    forceActivate: Boolean((workflow as Record<string, unknown>).active),
  })
  if (!governance.allowed) {
    return mergeAuthResponse(badRequestResponse(governance.reason || 'Governance denied'), authResponse)
  }

  const wf = workflow as Record<string, unknown>
  const enforcedTags = new Set<string>([
    'source:empire',
    'state:draft',
    `owner_agent:${body.owner_agent || 'unknown'}`,
  ])
  const incomingTags = Array.isArray(wf.tags)
    ? wf.tags
        .map((t) => (typeof t === 'string' ? t : (t && typeof t === 'object' ? String((t as any).name || '') : '')))
        .filter(Boolean)
    : []
  incomingTags.forEach((t) => enforcedTags.add(t))

  const createPayload = {
    ...wf,
    active: false,
    tags: Array.from(enforcedTags).map((name) => ({ name })),
  }

  try {
    const created = await n8nRequest<Record<string, any>>('/api/v1/workflows', {
      method: 'POST',
      body: createPayload,
    })

    const workflowId = String(created.id ?? '')
    if (workflowId && supabaseAdmin) {
      const { error: upsertErr } = await supabaseAdmin.from('automation_jobs').upsert(
        {
          external_id: workflowId,
          name: String(created.name ?? wf.name ?? `n8n:${workflowId}`),
          description: (wf.description as string | undefined) ?? null,
          job_type: 'event_triggered',
          enabled: false,
          handler: `n8n.workflow.${workflowId}`,
          payload: {},
          policy: {
            draft_first: true,
            risk_tier: body.risk_tier || 'low',
          },
          workspace_id: body.workspace_id || null,
          project_id: body.project_id || null,
          metadata: {
            owner_agent: body.owner_agent || 'unknown',
            source: 'empire_n8n',
          },
          last_status: 'pending',
        },
        { onConflict: 'external_id' }
      )

      if (upsertErr) {
        return mergeAuthResponse(databaseErrorResponse('Workflow created but failed to sync automation job', upsertErr), authResponse)
      }
    }

    return NextResponse.json({ workflow: created }, { status: 201 })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create workflow' },
      { status: 500 }
    )
  }
}
