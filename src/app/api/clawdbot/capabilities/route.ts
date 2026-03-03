import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const CLAWDBOT_API = process.env.CLAWDBOT_API_URL ?? 'http://127.0.0.1:18794'

export async function GET(_req: NextRequest) {
  const token = process.env.OPENCLAW_SERVICE_TOKEN ?? ''

  try {
    const headers: Record<string, string> = {}
    if (token) headers['Authorization'] = `Bearer ${token}`

    const res = await fetch(`${CLAWDBOT_API}/capabilities`, {
      headers,
      signal: AbortSignal.timeout(4000),
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Clawdbot capabilities unavailable', status: res.status },
        { status: res.status }
      )
    }

    return NextResponse.json(await res.json())
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Clawdbot capabilities unreachable', detail: err?.message ?? 'timeout' },
      { status: 503 }
    )
  }
}
