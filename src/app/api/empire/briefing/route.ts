import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const CLAWDBOT_API = process.env.CLAWDBOT_API_URL ?? 'http://127.0.0.1:18794'

export async function GET(_req: NextRequest) {
  try {
    const token = process.env.OPENCLAW_SERVICE_TOKEN
    const res = await fetch(`${CLAWDBOT_API}/intel/latest`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      signal: AbortSignal.timeout(5000),
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Briefing unavailable', status: res.status },
        { status: res.status }
      )
    }

    const intel = await res.json()

    // Map intel format to briefing format
    const briefing = {
      date: intel.date ?? new Date().toISOString().split('T')[0],
      summary: intel.summary ?? '',
      sections: {
        top_repos: (intel.repos ?? []).slice(0, 5).map((r: any) => ({
          name: r.name,
          score: r.score,
          verdict: r.verdict,
          description: r.description,
        })),
      },
      repo_count: (intel.repos ?? []).length,
    }

    return NextResponse.json(briefing)
  } catch {
    return NextResponse.json(
      {
        error: 'Briefing service unreachable',
        stub: true,
        date: new Date().toISOString().split('T')[0],
        summary: 'No briefing available — ClawdBot API unreachable.',
        sections: {},
      },
      { status: 503 }
    )
  }
}
