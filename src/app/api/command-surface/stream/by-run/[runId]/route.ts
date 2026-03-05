import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { getJobIdByRunId } from '@/lib/command-surface/stream-broker'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface Params {
  params: Promise<{ runId: string }>
}

export async function GET(req: NextRequest, { params }: Params) {
  const { runId } = await params
  const { user, error, response: authResponse } = await getAuthUser(req)

  if (error || !user) {
    return mergeAuthResponse(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), authResponse)
  }

  const jobId = await getJobIdByRunId(runId)
  if (!jobId) {
    return mergeAuthResponse(
      NextResponse.json({ error: 'No stream found for this run' }, { status: 404 }),
      authResponse
    )
  }

  return mergeAuthResponse(
    NextResponse.json({
      jobId,
      stream_url: `/api/command-surface/stream/${jobId}`,
    }),
    authResponse
  )
}
