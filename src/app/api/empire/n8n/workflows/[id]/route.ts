import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { authRequiredResponse, badRequestResponse } from '@/lib/api/response-helpers'
import { n8nRequest } from '@/lib/n8n/client'
import { canCreateOrUpdateWorkflow } from '@/lib/n8n/governance'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { user, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  const { id } = await params
  try {
    const workflow = await n8nRequest(`/api/v1/workflows/${encodeURIComponent(id)}`)
    return NextResponse.json({ workflow })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch workflow'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const { user, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  const { id } = await params
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

  const enforcedPayload = {
    ...(workflow as Record<string, unknown>),
    active: false,
  }

  try {
    const updated = await n8nRequest(`/api/v1/workflows/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: enforcedPayload,
    })

    return NextResponse.json({ workflow: updated })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update workflow'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

