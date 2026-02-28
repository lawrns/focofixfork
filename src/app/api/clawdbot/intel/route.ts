import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const CLAWDBOT_API = process.env.CLAWDBOT_API_URL ?? 'http://127.0.0.1:18794'

export async function GET(req: NextRequest) {
  const token = process.env.OPENCLAW_SERVICE_TOKEN ?? ''
  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date') // optional — defaults to latest

  try {
    const headers: Record<string, string> = {}
    if (token) headers['Authorization'] = `Bearer ${token}`

    const endpoint = date
      ? `${CLAWDBOT_API}/intel/${date}`
      : `${CLAWDBOT_API}/intel/latest`

    const res = await fetch(endpoint, {
      headers,
      signal: AbortSignal.timeout(6000),
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
