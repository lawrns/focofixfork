import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { getJobIdByRunId } from '@/lib/command-surface/stream-broker'
import { readCommandSurfaceTrace } from '@/lib/runs/trace'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// If a run was created more than this many ms ago and has no stream job,
// it belongs to a previous server session and will never get a stream.
// Tell the client to stop retrying immediately.
const STREAM_STALENESS_MS = 60_000

interface Params {
  params: Promise<{ runId: string }>
}

export async function GET(req: NextRequest, { params }: Params) {
  const { runId } = await params
  const { user, supabase, error, response: authResponse } = await getAuthUser(req)

  if (error || !user) {
    return mergeAuthResponse(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), authResponse)
  }

  const { data: run } = await supabase
    .from('runs')
    .select('created_at, trace')
    .eq('id', runId)
    .single()

  if (!run) {
    return mergeAuthResponse(NextResponse.json({ error: 'Run not found' }, { status: 404 }), authResponse)
  }

  const trace = readCommandSurfaceTrace(run.trace)
  const jobId = (await getJobIdByRunId(runId)) ?? trace.job_id

  if (!jobId) {
    const ageMs = Date.now() - new Date(run.created_at).getTime()
    const retryable = ageMs <= STREAM_STALENESS_MS && trace.stream_state !== 'ended' && trace.stream_state !== 'unavailable'
    const state = retryable ? 'resolving' : trace.stream_state === 'ended' ? 'ended' : 'unavailable'
    const reason = retryable ? 'awaiting_stream_registration' : trace.stream_state === 'ended' ? 'stream_ended' : 'no_live_stream'

    return mergeAuthResponse(
      NextResponse.json({
        state,
        retryable,
        reason,
        jobId: null,
      }),
      authResponse
    )
  }

  return mergeAuthResponse(
    NextResponse.json({
      state: trace.stream_state === 'ended' ? 'ended' : 'live',
      retryable: false,
      jobId,
      stream_url: `/api/command-surface/stream/${jobId}`,
      available: true,
    }),
    authResponse
  )
}
