import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import {
  authRequiredResponse,
  databaseErrorResponse,
  successResponse,
  validationFailedResponse,
} from '@/lib/api/response-helpers'

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
    const resolution = typeof body.resolution === 'string' && body.resolution.trim().length > 0
      ? body.resolution.trim()
      : 'resolved'

    const now = new Date().toISOString()

    const { data, error } = await supabase
      .from('cofounder_pivotal_queue')
      .update({
        status: 'resolved',
        delivery_state: 'resolved',
        resolution,
        resolved_by: user.id,
        resolved_at: now,
      })
      .eq('id', params.id)
      .eq('user_id', user.id)
      .select('id, status, delivery_state, resolution, resolved_at')
      .single<{
        id: string
        status: string
        delivery_state: string
        resolution: string | null
        resolved_at: string | null
      }>()

    if (error) {
      return mergeAuthResponse(databaseErrorResponse('Failed to resolve pivotal question', error), authResponse)
    }

    await supabase.from('cofounder_decisions_history').insert({
      user_id: user.id,
      workspace_id: null,
      event_type: 'pivotal_resolved',
      severity: 'info',
      title: `Pivotal ${params.id} resolved`,
      detail: resolution,
      payload: {
        id: params.id,
        resolution,
      },
    })

    return mergeAuthResponse(successResponse({ item: data }), authResponse)
  } catch (error: unknown) {
    return mergeAuthResponse(databaseErrorResponse('Failed to resolve pivotal question', error), authResponse)
  }
}
