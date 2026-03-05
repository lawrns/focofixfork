import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { authRequiredResponse, successResponse, validationFailedResponse, databaseErrorResponse } from '@/lib/api/response-helpers'
import type { CoFounderValidateActionInput } from '@/lib/autonomy/types'
import { validateCoFounderAction } from '@/lib/cofounder-mode/validate-action'

export const dynamic = 'force-dynamic'

function parseValidationInput(body: Record<string, unknown>): CoFounderValidateActionInput | null {
  if (typeof body.actionType !== 'string' || typeof body.domain !== 'string') {
    return null
  }

  return {
    actionType: body.actionType,
    domain: body.domain,
    estimatedSpendUsd: typeof body.estimatedSpendUsd === 'number' ? body.estimatedSpendUsd : undefined,
    confidence: typeof body.confidence === 'number' ? body.confidence : undefined,
    externalMessageCount: typeof body.externalMessageCount === 'number' ? body.externalMessageCount : undefined,
    liveExperimentCount: typeof body.liveExperimentCount === 'number' ? body.liveExperimentCount : undefined,
    productionImpact: typeof body.productionImpact === 'boolean' ? body.productionImpact : undefined,
    irreversible: typeof body.irreversible === 'boolean' ? body.irreversible : undefined,
  }
}

function parseSessionId(body: Record<string, unknown>): string | null {
  if (typeof body.sessionId === 'string' && body.sessionId.length > 0) {
    return body.sessionId
  }
  return null
}

function parseWorkspaceId(body: Record<string, unknown>): string | null {
  if (typeof body.workspace_id === 'string' && body.workspace_id.length > 0) {
    return body.workspace_id
  }
  return null
}

export async function POST(req: NextRequest) {
  let authResponse: NextResponse | undefined
  try {
    const { user, supabase, error: authError, response } = await getAuthUser(req)
    authResponse = response
    if (authError || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

    const body = await req.json().catch(() => ({} as Record<string, unknown>))
    const actionInput = parseValidationInput(body)
    const sessionId = parseSessionId(body)
    const workspaceId = parseWorkspaceId(body)
    if (!actionInput) {
      return mergeAuthResponse(validationFailedResponse('actionType and domain are required'), authResponse)
    }

    const result = await validateCoFounderAction(supabase, user.id, actionInput, workspaceId, sessionId)

    await supabase.from('autonomy_action_logs').insert({
      session_id: sessionId,
      user_id: user.id,
      action_type: actionInput.actionType,
      domain: actionInput.domain,
      input: actionInput as unknown as Record<string, unknown>,
      decision: result.decision as unknown as Record<string, unknown>,
      allowed: result.decision.allowed,
      requires_approval: result.decision.requiresApproval,
    })

    await supabase.from('ledger_events').insert({
      type: 'autonomy_action_validation',
      source: 'cofounder',
      context_id: sessionId,
      payload: {
        sessionId,
        ...actionInput,
        ...result.decision,
        mode: result.legacyPolicy.mode,
        profile: result.legacyPolicy.profile,
      },
      timestamp: new Date().toISOString(),
    })

    return mergeAuthResponse(successResponse({
      policy: result.legacyPolicy,
      decision: result.decision,
      configSource: result.configSource,
      issues: result.issues,
    }), authResponse)
  } catch (error: unknown) {
    return mergeAuthResponse(databaseErrorResponse('Failed to validate action against policy', error), authResponse)
  }
}
