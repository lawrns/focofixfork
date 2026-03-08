import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { getJobIdByRunId } from '@/lib/command-surface/stream-broker'

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

  const jobId = await getJobIdByRunId(runId)
  if (!jobId) {
    // Check if the run is old enough that a stream will never arrive.
    // New runs within the staleness window may still have their stream job
    // registered imminently — those should keep retrying.
    let retryable = true
    try {
      const { data: run } = await supabase
        .from('runs')
        .select('created_at')
        .eq('id', runId)
        .single()

      if (run?.created_at) {
        const ageMs = Date.now() - new Date(run.created_at).getTime()
        if (ageMs > STREAM_STALENESS_MS) retryable = false
      }
    } catch {
      // If we can't query, keep retryable=true so the client tries normally.
    }

    return mergeAuthResponse(
      NextResponse.json({ error: 'No stream found for this run', retryable }, { status: 404 }),
      authResponse
    )
  }

  return mergeAuthResponse(
    NextResponse.json({
      jobId,
      stream_url: `/api/command-surface/stream/${jobId}`,
      available: true,
    }),
    authResponse
  )
}
