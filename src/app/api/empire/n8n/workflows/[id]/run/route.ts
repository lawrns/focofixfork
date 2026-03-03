import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { authRequiredResponse } from '@/lib/api/response-helpers'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * n8n API on this instance does not expose POST /workflows/{id}/run.
 * Manual execution should be done through workflow-specific webhook/test paths.
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  const { user, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)
  const { id } = await params

  return NextResponse.json(
    {
      error: 'Direct run endpoint is not supported by this n8n version.',
      workflow_id: id,
      hint: 'Use workflow-specific webhook trigger or activate schedule/webhook trigger.',
      code: 'N8N_RUN_UNSUPPORTED',
    },
    { status: 501 }
  )
}

