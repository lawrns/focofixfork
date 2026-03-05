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
    const recommendations = Array.isArray(intel.recommendations)
      ? intel.recommendations.filter((r: unknown) => typeof r === 'string')
      : []
    const topRepos = Array.isArray(intel.repos)
      ? intel.repos.slice(0, 8).map((r: any) => ({
          name: typeof r?.name === 'string' ? r.name : undefined,
          score: typeof r?.score === 'number' ? r.score : undefined,
          verdict: typeof r?.verdict === 'string' ? r.verdict : undefined,
          description: typeof r?.description === 'string' ? r.description : undefined,
        }))
      : []
    const text =
      (typeof intel.text === 'string' && intel.text) ||
      (typeof intel.full_text === 'string' && intel.full_text) ||
      ''

    // Map intel format to briefing format
    const briefing = {
      date: intel.date ?? new Date().toISOString().split('T')[0],
      summary: intel.summary ?? '',
      text,
      sections: {
        intelligence:
          typeof intel.intelligence === 'string'
            ? intel.intelligence
            : typeof intel.market_summary === 'string'
              ? intel.market_summary
              : undefined,
        codebase:
          typeof intel.codebase === 'string'
            ? intel.codebase
            : typeof intel.code_summary === 'string'
              ? intel.code_summary
              : undefined,
        recommendations,
        top_repos: topRepos,
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
