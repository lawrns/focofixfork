import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

const CLAWDBOT_API = process.env.CLAWDBOT_API_URL ?? 'http://127.0.0.1:18794'

async function fetchSocialIntelligence() {
  try {
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()

    const { data: items } = await supabaseAdmin
      .from('content_items')
      .select(`
        id, ai_summary, ai_tags, relevance_score, published_at, created_at,
        content_sources!inner(name, platform)
      `)
      .not('content_sources.platform', 'is', null)
      .not('ai_summary', 'is', null)
      .gte('created_at', cutoff)
      .order('relevance_score', { ascending: false })
      .limit(20)

    if (!items || items.length === 0) return null

    const topInsights = items.slice(0, 5).map((item: any) => ({
      summary: item.ai_summary,
      platform: item.content_sources?.platform,
      source_name: item.content_sources?.name,
      relevance: item.relevance_score,
      tags: item.ai_tags || [],
    }))

    // Aggregate themes
    const tagCounts: Record<string, number> = {}
    for (const item of items) {
      for (const tag of ((item as any).ai_tags || [])) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1
      }
    }
    const themes = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([tag]) => tag)

    // Platform breakdown
    const platforms: string[] = []
    for (const item of items) {
      const p = (item as any).content_sources?.platform
      if (p && !platforms.includes(p)) platforms.push(p)
    }

    return {
      item_count: items.length,
      platforms,
      top_insights: topInsights,
      themes,
    }
  } catch {
    return null
  }
}

export async function GET(_req: NextRequest) {
  try {
    const token = process.env.OPENCLAW_SERVICE_TOKEN
    const [intelRes, socialIntel] = await Promise.all([
      fetch(`${CLAWDBOT_API}/intel/latest`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        signal: AbortSignal.timeout(5000),
      }).catch(() => null),
      fetchSocialIntelligence(),
    ])

    if (!intelRes || !intelRes.ok) {
      // Even if ClawdBot is down, return social intel if available
      const briefing = {
        error: intelRes ? 'Briefing unavailable' : 'Briefing service unreachable',
        stub: !socialIntel,
        date: new Date().toISOString().split('T')[0],
        summary: socialIntel
          ? 'ClawdBot briefing unavailable, but social intelligence is active.'
          : 'No briefing available — ClawdBot API unreachable.',
        sections: {},
        ...(socialIntel ? { social_intelligence: socialIntel } : {}),
      }
      return NextResponse.json(briefing, { status: socialIntel ? 200 : 503 })
    }

    const intel = await intelRes.json()
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
    const briefing: Record<string, unknown> = {
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

    if (socialIntel) {
      briefing.social_intelligence = socialIntel
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
