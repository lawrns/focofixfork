import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import {
  successResponse,
  authRequiredResponse,
  notFoundResponse,
  internalErrorResponse,
} from '@/lib/api/response-helpers'
import { supabaseAdmin } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

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
