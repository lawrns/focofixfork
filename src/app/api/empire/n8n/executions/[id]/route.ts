import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { authRequiredResponse } from '@/lib/api/response-helpers'
import { n8nRequest } from '@/lib/n8n/client'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { user, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  const { id } = await params
  try {
    const execution = await n8nRequest(`/api/v1/executions/${encodeURIComponent(id)}`)
    return NextResponse.json(execution)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch execution'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

