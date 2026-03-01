import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import {
  successResponse,
  authRequiredResponse,
  internalErrorResponse,
  createPaginationMeta,
} from '@/lib/api/response-helpers'
import { supabaseAdmin } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
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

    const { searchParams } = new URL(req.url)
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 100)
    const offset = parseInt(searchParams.get('offset') ?? '0')
    const status = searchParams.get('status')

    let query = supabaseAdmin
      .from('pipeline_runs')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error: dbError, count } = await query

    if (dbError) {
      return mergeAuthResponse(internalErrorResponse('Failed to fetch pipeline runs', dbError), authResponse)
    }

    return mergeAuthResponse(
      successResponse(
        { runs: data ?? [] },
        createPaginationMeta(count ?? 0, limit, offset)
      ),
      authResponse
    )
  } catch (err) {
    return mergeAuthResponse(
      internalErrorResponse('Unexpected error', err instanceof Error ? err.message : err),
      authResponse
    )
  }
}
