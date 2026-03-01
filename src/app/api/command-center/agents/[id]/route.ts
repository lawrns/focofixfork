import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { authRequiredResponse } from '@/lib/api/response-helpers'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  const { id } = await params
  const token = process.env.OPENCLAW_SERVICE_TOKEN

  try {
    const res = await fetch(`http://127.0.0.1:18794/agents/${encodeURIComponent(id)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      signal: AbortSignal.timeout(5000),
    })

    if (!res.ok) {
      return NextResponse.json({ error: `Agent not found (${res.status})` }, { status: res.status })
    }

    const data = await res.json()
    // Log raw shape for debugging (fields vary by agent type)
    console.log('[agents/[id]] raw fields:', Object.keys(data ?? {}))
    return NextResponse.json({ data })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: `ClawdBot unavailable: ${message}` }, { status: 503 })
  }
}
