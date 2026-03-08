import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import {
  authRequiredResponse,
  successResponse,
  databaseErrorResponse,
  notFoundResponse,
} from '@/lib/api/response-helpers'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  let authResponse: NextResponse | undefined
  try {
    const { user, supabase, error: authError, response } = await getAuthUser(req)
    authResponse = response
    if (authError || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

    const { id } = params
    const { searchParams } = new URL(req.url)
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') ?? '20', 10)))

    // Verify loop ownership
    const { data: loop, error: loopError } = await supabase
      .from('cofounder_loops')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .single()

    if (loopError || !loop) {
      return mergeAuthResponse(notFoundResponse('Loop', id), authResponse)
    }

    // Fetch iterations (autonomy_sessions) for this loop with job counts
    const { data: iterations, error: iterError, count } = await supabase
      .from('autonomy_sessions')
      .select(
        `
        id,
        status,
        objective,
        mode,
        profile,
        window_start,
        window_end,
        created_at,
        updated_at,
        summary,
        autonomy_session_jobs (
          id,
          status
        )
        `,
        { count: 'exact' }
      )
      .eq('loop_id', id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (iterError) {
      return mergeAuthResponse(
        databaseErrorResponse('Failed to fetch loop iterations', iterError),
        authResponse,
      )
    }

    // Annotate each iteration with job summary counts
    const annotated = (iterations ?? []).map((iter: Record<string, unknown>) => {
      const jobs = Array.isArray(iter.autonomy_session_jobs)
        ? (iter.autonomy_session_jobs as Array<{ id: string; status: string }>)
        : []
      return {
        ...iter,
        job_counts: {
          total: jobs.length,
          completed: jobs.filter((j) => j.status === 'completed').length,
          running: jobs.filter((j) => j.status === 'running').length,
          failed: jobs.filter((j) => j.status === 'failed').length,
          pending: jobs.filter((j) => j.status === 'pending').length,
        },
      }
    })

    return mergeAuthResponse(
      successResponse({ data: annotated, count: count ?? 0 }),
      authResponse,
    )
  } catch (error: unknown) {
    return mergeAuthResponse(
      databaseErrorResponse('Failed to fetch loop iterations', error),
      authResponse,
    )
  }
}
