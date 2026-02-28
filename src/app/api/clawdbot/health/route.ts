import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const CLAWDBOT_API = process.env.CLAWDBOT_API_URL ?? 'http://127.0.0.1:18794'

export async function GET(req: NextRequest) {
  const token = process.env.OPENCLAW_SERVICE_TOKEN ?? ''

  try {
    const headers: Record<string, string> = {}
    if (token) headers['Authorization'] = `Bearer ${token}`

    const res = await fetch(`${CLAWDBOT_API}/health`, {
      headers,
      signal: AbortSignal.timeout(4000),
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Clawdbot API returned non-OK', status: res.status },
        { status: res.status }
      )
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Clawdbot API unreachable', detail: err?.message ?? 'timeout' },
      { status: 503 }
    )
  }
}
