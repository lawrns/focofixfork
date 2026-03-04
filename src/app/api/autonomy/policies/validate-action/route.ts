import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { authRequiredResponse, successResponse, validationFailedResponse, databaseErrorResponse } from '@/lib/api/response-helpers'
import { getUserCoFounderPolicy } from '@/lib/autonomy/settings'
import { evaluateActionAgainstPolicy, isInOvernightWindow } from '@/lib/autonomy/policy'
import type { CoFounderValidateActionInput } from '@/lib/autonomy/types'

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

export async function POST(req: NextRequest) {
  let authResponse: NextResponse | undefined
  try {
    const { user, supabase, error: authError, response } = await getAuthUser(req)
    authResponse = response
    if (authError || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

    const body = await req.json().catch(() => ({} as Record<string, unknown>))
    const actionInput = parseValidationInput(body)
    const sessionId = parseSessionId(body)
    if (!actionInput) {
      return mergeAuthResponse(validationFailedResponse('actionType and domain are required'), authResponse)
    }

    const policy = await getUserCoFounderPolicy(supabase, user.id)
    const result = evaluateActionAgainstPolicy(policy, actionInput)

    if (!isInOvernightWindow(policy)) {
      result.allowed = false
      result.violatedRules = [...result.violatedRules, 'outside_overnight_window']
      result.reasons = [...result.reasons, 'Action is outside configured overnight window']
    }

    await supabase.from('autonomy_action_logs').insert({
      session_id: sessionId,
      user_id: user.id,
      action_type: actionInput.actionType,
      domain: actionInput.domain,
      input: actionInput as unknown as Record<string, unknown>,
      decision: result as unknown as Record<string, unknown>,
      allowed: result.allowed,
      requires_approval: result.requiresApproval,
    })

    await supabase.from('ledger_events').insert({
      type: 'autonomy_action_validation',
      source: 'cofounder',
      context_id: sessionId,
      payload: {
        sessionId,
        ...actionInput,
        ...result,
        mode: policy.mode,
        profile: policy.profile,
      },
      timestamp: new Date().toISOString(),
    })

    return mergeAuthResponse(successResponse({
      policy,
      decision: result,
    }), authResponse)
  } catch (error: unknown) {
    return mergeAuthResponse(databaseErrorResponse('Failed to validate action against policy', error), authResponse)
  }
}
