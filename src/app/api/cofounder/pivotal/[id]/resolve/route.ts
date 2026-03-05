import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import {
  authRequiredResponse,
  databaseErrorResponse,
  forbiddenResponse,
  notFoundResponse,
  successResponse,
  validationFailedResponse,
} from '@/lib/api/response-helpers'
import { resolvePivotalQuestion, type PivotalResolutionDecision } from '@/lib/cofounder-mode/pivotal-resolution'

export const dynamic = 'force-dynamic'

interface Params {
  params: {
    id: string
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  let authResponse: NextResponse | undefined
  try {
    const { user, supabase, error: authError, response } = await getAuthUser(req)
    authResponse = response

    if (authError || !user) {
      return mergeAuthResponse(authRequiredResponse(), authResponse)
    }

    if (!params.id) {
      return mergeAuthResponse(validationFailedResponse('id is required'), authResponse)
    }

    const body = await req.json().catch(() => ({} as Record<string, unknown>))
    const rawResolution = typeof body.resolution === 'string' ? body.resolution.trim().toLowerCase() : 'resolved'
    const decision: PivotalResolutionDecision =
      rawResolution === 'approve' || rawResolution === 'reject' || rawResolution === 'defer' || rawResolution === 'resolved'
        ? rawResolution
        : 'resolved'

    const result = await resolvePivotalQuestion(supabase, {
      pivotalId: params.id,
      decision,
      resolverChannel: 'app',
      resolverUserId: user.id,
      expectedOwnerUserId: user.id,
      resolverMeta: {
        route: '/api/cofounder/pivotal/[id]/resolve',
      },
    })

    if (!result.ok) {
      if (result.code === 'not_found') {
        return mergeAuthResponse(notFoundResponse('Pivotal question', params.id), authResponse)
      }
      if (result.code === 'forbidden') {
        return mergeAuthResponse(forbiddenResponse('Pivotal question access denied'), authResponse)
      }
      if (result.code === 'invalid_state') {
        return mergeAuthResponse(validationFailedResponse(result.message ?? 'Invalid pivotal state'), authResponse)
      }
      return mergeAuthResponse(databaseErrorResponse('Failed to resolve pivotal question', result.message), authResponse)
    }

    return mergeAuthResponse(successResponse({ item: result.item }), authResponse)
  } catch (error: unknown) {
    return mergeAuthResponse(databaseErrorResponse('Failed to resolve pivotal question', error), authResponse)
  }
}
