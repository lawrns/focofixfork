import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { authRequiredResponse, badRequestResponse } from '@/lib/api/response-helpers'
import { n8nRequest } from '@/lib/n8n/client'
import { canActivateWorkflow } from '@/lib/n8n/governance'
import { supabaseAdmin } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { user, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  const { id } = await params
  const body = await req.json().catch(() => ({}))

  const decision = canActivateWorkflow({
    ownerAgent: body.owner_agent,
    riskTier: body.risk_tier,
    hasExternalMessaging: Boolean(body.has_external_messaging),
    hasFinancialAction: Boolean(body.has_financial_action),
  })
  if (!decision.allowed) {
    return mergeAuthResponse(badRequestResponse(decision.reason || 'Activation denied by governance'), authResponse)
  }

  try {
    const workflow = await n8nRequest(`/api/v1/workflows/${encodeURIComponent(id)}/activate`, {
      method: 'POST',
      body: {},
    })

    if (supabaseAdmin) {
      await supabaseAdmin
        .from('automation_jobs')
        .update({
          enabled: true,
          last_status: 'running',
          updated_at: new Date().toISOString(),
        })
        .eq('external_id', id)
    }

    return NextResponse.json({ workflow })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to activate workflow'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

