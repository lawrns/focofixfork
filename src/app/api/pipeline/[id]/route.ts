import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import {
  successResponse,
  authRequiredResponse,
  badRequestResponse,
  notFoundResponse,
  internalErrorResponse,
} from '@/lib/api/response-helpers'
import { supabaseAdmin } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'
const MUTABLE_STATUSES = new Set(['planning', 'executing', 'reviewing', 'complete', 'failed', 'cancelled'])

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  let authResponse: NextResponse | undefined
  try {
    const { user, error, response } = await getAuthUser(req)
    authResponse = response

    if (error || !user) {
      return mergeAuthResponse(authRequiredResponse(), authResponse)
    }

    if (!supabaseAdmin) {
      return mergeAuthResponse(internalErrorResponse('DB not available'), authResponse)
    }

    const { data: run, error: dbError } = await supabaseAdmin
      .from('pipeline_runs')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (dbError || !run) {
      return mergeAuthResponse(notFoundResponse('pipeline_run', params.id), authResponse)
    }

    return mergeAuthResponse(successResponse({ run }), authResponse)
  } catch (err) {
    return mergeAuthResponse(
      internalErrorResponse('Unexpected error', err instanceof Error ? err.message : err),
      authResponse
    )
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  let authResponse: NextResponse | undefined
  try {
    const { user, error, response } = await getAuthUser(req)
    authResponse = response

    if (error || !user) {
      return mergeAuthResponse(authRequiredResponse(), authResponse)
    }

    if (!supabaseAdmin) {
      return mergeAuthResponse(internalErrorResponse('DB not available'), authResponse)
    }

    const body = await req.json()
    const update: Record<string, unknown> = {}

    if (typeof body?.status === 'string') {
      if (!MUTABLE_STATUSES.has(body.status)) {
        return mergeAuthResponse(
          badRequestResponse(`Invalid status. Allowed: ${Array.from(MUTABLE_STATUSES).join(', ')}`),
          authResponse
        )
      }
      update.status = body.status
    }

    if (typeof body?.auto_reviewed === 'boolean') {
      update.auto_reviewed = body.auto_reviewed
    }

    if (typeof body?.handbook_ref === 'string' || body?.handbook_ref === null) {
      update.handbook_ref = body.handbook_ref
    }

    if (Object.keys(update).length === 0) {
      return mergeAuthResponse(badRequestResponse('No mutable fields provided'), authResponse)
    }

    const { data: run, error: dbError } = await supabaseAdmin
      .from('pipeline_runs')
      .update(update)
      .eq('id', params.id)
      .eq('user_id', user.id)
      .select('*')
      .single()

    if (dbError || !run) {
      return mergeAuthResponse(notFoundResponse('pipeline_run', params.id), authResponse)
    }

    return mergeAuthResponse(successResponse({ run }), authResponse)
  } catch (err) {
    return mergeAuthResponse(
      internalErrorResponse('Unexpected error', err instanceof Error ? err.message : err),
      authResponse
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  let authResponse: NextResponse | undefined
  try {
    const { user, error, response } = await getAuthUser(req)
    authResponse = response

    if (error || !user) {
      return mergeAuthResponse(authRequiredResponse(), authResponse)
    }

    if (!supabaseAdmin) {
      return mergeAuthResponse(internalErrorResponse('DB not available'), authResponse)
    }

    const { data: run, error: dbError } = await supabaseAdmin
      .from('pipeline_runs')
      .delete()
      .eq('id', params.id)
      .eq('user_id', user.id)
      .select('id')
      .single()

    if (dbError || !run) {
      return mergeAuthResponse(notFoundResponse('pipeline_run', params.id), authResponse)
    }

    return mergeAuthResponse(successResponse({ deleted: true, id: params.id }), authResponse)
  } catch (err) {
    return mergeAuthResponse(
      internalErrorResponse('Unexpected error', err instanceof Error ? err.message : err),
      authResponse
    )
  }
}
