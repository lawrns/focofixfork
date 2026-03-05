import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import {
  authRequiredResponse,
  databaseErrorResponse,
  successResponse,
  validationFailedResponse,
} from '@/lib/api/response-helpers'
import type { CoFounderActionValidationInput } from '@/lib/cofounder-mode/types'
import { validateCoFounderAction } from '@/lib/cofounder-mode/validate-action'

export const dynamic = 'force-dynamic'

function parseValidationInput(body: Record<string, unknown>): CoFounderActionValidationInput | null {
  if (typeof body.actionType !== 'string' || typeof body.domain !== 'string') {
    return null
  }

  const agentVotes = Array.isArray(body.agentVotes)
    ? body.agentVotes
      .filter((vote): vote is Record<string, unknown> => Boolean(vote) && typeof vote === 'object')
      .map((vote) => ({
        agentId: typeof vote.agentId === 'string' ? vote.agentId : 'unknown',
        approve: Boolean(vote.approve),
        confidence: typeof vote.confidence === 'number' ? vote.confidence : 0,
        weight: typeof vote.weight === 'number' ? vote.weight : undefined,
        rationale: typeof vote.rationale === 'string' ? vote.rationale : undefined,
      }))
    : undefined

  return {
    actionType: body.actionType,
    domain: body.domain,
    estimatedSpendUsd: typeof body.estimatedSpendUsd === 'number' ? body.estimatedSpendUsd : undefined,
    confidence: typeof body.confidence === 'number' ? body.confidence : undefined,
    externalMessageCount: typeof body.externalMessageCount === 'number' ? body.externalMessageCount : undefined,
    liveExperimentCount: typeof body.liveExperimentCount === 'number' ? body.liveExperimentCount : undefined,
    productionImpact: typeof body.productionImpact === 'boolean' ? body.productionImpact : undefined,
    irreversible: typeof body.irreversible === 'boolean' ? body.irreversible : undefined,
    trustScore: typeof body.trustScore === 'number' ? body.trustScore : undefined,
    strategicPriority:
      typeof body.strategicPriority === 'string'
        ? body.strategicPriority as CoFounderActionValidationInput['strategicPriority']
        : undefined,
    integrationKey: typeof body.integrationKey === 'string' ? body.integrationKey : undefined,
    actionKind: body.actionKind === 'read' || body.actionKind === 'write' ? body.actionKind : undefined,
    agentVotes,
  }
}

function parseWorkspaceId(body: Record<string, unknown>): string | null {
  return typeof body.workspace_id === 'string' && body.workspace_id.length > 0
    ? body.workspace_id
    : null
}

function parseSessionId(body: Record<string, unknown>): string | null {
  return typeof body.sessionId === 'string' && body.sessionId.length > 0
    ? body.sessionId
    : null
}

export async function POST(req: NextRequest) {
  let authResponse: NextResponse | undefined
  let fallbackAction: CoFounderActionValidationInput | null = null
  try {
    const { user, supabase, error: authError, response } = await getAuthUser(req)
    authResponse = response

    if (authError || !user) {
      return mergeAuthResponse(authRequiredResponse(), authResponse)
    }

    const body = await req.json().catch(() => ({} as Record<string, unknown>))
    const actionInput = parseValidationInput(body)
    fallbackAction = actionInput
    const workspaceId = parseWorkspaceId(body)
    const sessionId = parseSessionId(body)

    if (!actionInput) {
      return mergeAuthResponse(validationFailedResponse('actionType and domain are required'), authResponse)
    }

    const result = await validateCoFounderAction(supabase, user.id, actionInput, workspaceId, sessionId)

    await supabase.from('ledger_events').insert({
      type: 'cofounder_action_validation',
      source: 'cofounder',
      context_id: sessionId,
      payload: {
        workspaceId,
        sessionId,
        action: actionInput,
        decision: result.decision,
        configSource: result.configSource,
      },
      timestamp: new Date().toISOString(),
      workspace_id: workspaceId,
    })

    return mergeAuthResponse(
      successResponse({
        config: result.canonicalConfig,
        policy: result.legacyPolicy,
        decision: result.decision,
        configSource: result.configSource,
        issues: result.issues,
      }),
      authResponse
    )
  } catch (error: unknown) {
    if (fallbackAction) {
      return mergeAuthResponse(
        successResponse({
          policy: null,
          config: null,
          decision: {
            allowed: true,
            requiresApproval: true,
            reasons: ['Validation service degraded; manual approval is required'],
            violatedRules: ['service_degraded'],
            effectiveMode: 'advisor',
            meta: {
              weightedApproval: 0,
              weightedConfidence: 0,
              divergenceScore: 0,
              resolution: 'approval_required',
              voteBreakdown: [],
              tieBrokenBy: 'strategic_priority',
            },
          },
          configSource: 'degraded_fallback',
          issues: [error instanceof Error ? error.message : 'Unknown validation failure'],
        }),
        authResponse
      )
    }
    return mergeAuthResponse(databaseErrorResponse('Failed to validate cofounder action', error), authResponse)
  }
}
