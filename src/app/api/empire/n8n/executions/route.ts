import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { authRequiredResponse } from '@/lib/api/response-helpers'
import { n8nRequest } from '@/lib/n8n/client'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { user, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  try {
    const { searchParams } = new URL(req.url)
    const executions = await n8nRequest('/api/v1/executions', {
      query: {
        workflowId: searchParams.get('workflowId'),
        status: searchParams.get('status'),
        limit: searchParams.get('limit') ?? 20,
        cursor: searchParams.get('cursor'),
      },
    })

    return NextResponse.json(executions)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch executions'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

