import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { authRequiredResponse, successResponse, databaseErrorResponse } from '@/lib/api/response-helpers'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  let authResponse: NextResponse | undefined
  try {
    const { user, supabase, error: authError, response } = await getAuthUser(req)
    authResponse = response
    if (authError || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') ?? '20', 10)))

    let query = supabase
      .from('autonomy_sessions')
      .select('id, run_id, objective, mode, profile, status, timezone, window_start, window_end, created_at, updated_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (status) query = query.eq('status', status)

    const { data, error } = await query
    if (error) {
      return mergeAuthResponse(databaseErrorResponse('Failed to fetch autonomy sessions', error), authResponse)
    }

    return mergeAuthResponse(successResponse({
      sessions: data ?? [],
    }), authResponse)
  } catch (error: unknown) {
    return mergeAuthResponse(databaseErrorResponse('Failed to fetch autonomy sessions', error), authResponse)
  }
}
