import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import {
  authRequiredResponse,
  badRequestResponse,
  databaseErrorResponse,
} from '@/lib/api/response-helpers'
import { listWorkflowTemplates, getWorkflowTemplateById } from '@/lib/n8n/templates/registry'
import { instantiateTemplateWorkflow } from '@/lib/n8n/templates/render'
import { n8nRequest } from '@/lib/n8n/client'
import { canCreateOrUpdateWorkflow } from '@/lib/n8n/governance'
import { supabaseAdmin } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { user, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  return NextResponse.json({ templates: listWorkflowTemplates() })
}

export async function POST(req: NextRequest) {
  const { user, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  const body = await req.json().catch(() => ({}))
  const templateId = String(body?.template_id ?? '').trim()
  if (!templateId) {
    return mergeAuthResponse(badRequestResponse('template_id is required'), authResponse)
  }

  const template = getWorkflowTemplateById(templateId)
  if (!template) {
    return mergeAuthResponse(badRequestResponse(`Unknown template_id: ${templateId}`), authResponse)
  }

  const { workflow } = instantiateTemplateWorkflow(
    template,
    (body?.parameters as Record<string, unknown> | undefined) ?? {}
  )
  const desiredName = String(body?.workflow_name ?? workflow.name ?? template.name).trim()
  const wf = {
    ...workflow,
    name: desiredName || template.name,
  } as Record<string, unknown>

  const governance = canCreateOrUpdateWorkflow({
    ownerAgent: String(body?.owner_agent ?? template.owner_agent),
    riskTier: (body?.risk_tier ?? template.risk_tier) as 'low' | 'medium' | 'high',
    hasExternalMessaging: Boolean(body?.has_external_messaging),
    hasFinancialAction: Boolean(body?.has_financial_action),
    forceActivate: Boolean(wf.active),
  })
  if (!governance.allowed) {
    return mergeAuthResponse(badRequestResponse(governance.reason || 'Governance denied'), authResponse)
  }

  const enforcedTags = new Set<string>([
    'source:empire',
    'state:draft',
    `template:${template.id}`,
    `owner_agent:${String(body?.owner_agent ?? template.owner_agent)}`,
  ])
  const incomingTags = Array.isArray(wf.tags)
    ? wf.tags
        .map((t) => (typeof t === 'string' ? t : t && typeof t === 'object' ? String((t as any).name || '') : ''))
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
          name: String(created.name ?? desiredName ?? `n8n:${workflowId}`),
          description: template.description,
          job_type: 'event_triggered',
          enabled: false,
          handler: `n8n.workflow.${workflowId}`,
          payload: {},
          policy: {
            draft_first: true,
            risk_tier: body?.risk_tier ?? template.risk_tier,
          },
          workspace_id: body?.workspace_id ?? null,
          project_id: body?.project_id ?? null,
          metadata: {
            owner_agent: body?.owner_agent ?? template.owner_agent,
            source: 'empire_n8n_template',
            template_id: template.id,
          },
          last_status: 'pending',
        },
        { onConflict: 'external_id' }
      )

      if (upsertErr) {
        return mergeAuthResponse(
          databaseErrorResponse('Workflow created but failed to sync automation job', upsertErr),
          authResponse
        )
      }
    }

    return NextResponse.json(
      {
        workflow: created,
        template: {
          id: template.id,
          name: template.name,
          owner_agent: template.owner_agent,
          risk_tier: template.risk_tier,
        },
      },
      { status: 201 }
    )
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create workflow from template' },
      { status: 500 }
    )
  }
}
