import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const CLAWDBOT_API = process.env.CLAWDBOT_API_URL ?? 'http://127.0.0.1:18794'

export async function GET(_req: NextRequest) {
  try {
    const res = await fetch(`${CLAWDBOT_API}/briefing/latest`, {
      signal: AbortSignal.timeout(5000),
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Briefing unavailable', status: res.status },
        { status: res.status }
      )
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json(
      {
        error: 'Briefing service unreachable',
        // Return a stub so the UI can render gracefully
        stub: true,
        date: new Date().toISOString().split('T')[0],
        summary: 'No briefing available — ClawdBot API unreachable.',
        sections: {},
      },
      { status: 503 }
    )
  }
}
