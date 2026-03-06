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
        id,
        ai_summary,
        ai_tags,
        relevance_score,
        signal_type,
        signal_confidence,
        signal_urgency,
        upgrade_implication,
        signal_payload,
        transcript_status,
        analysis_status,
        content_sources!inner(name, platform, status)
      `)
      .not('content_sources.platform', 'is', null)
      .gte('created_at', cutoff)
      .order('relevance_score', { ascending: false })
      .limit(50)

    if (!items || items.length === 0) return null

    const analyzed = items.filter((item: any) => item.ai_summary || item.analysis_status === 'complete')
    const topInsights = analyzed.slice(0, 5).map((item: any) => ({
      summary: item.ai_summary,
      platform: item.content_sources?.platform,
      source_name: item.content_sources?.name,
      relevance: item.relevance_score,
      tags: item.ai_tags || [],
      signal_type: item.signal_type ?? item.signal_payload?.signal_type ?? null,
      urgency: item.signal_urgency ?? item.signal_payload?.urgency ?? null,
      confidence: item.signal_confidence ?? item.signal_payload?.confidence ?? null,
      upgrade_implication: item.upgrade_implication ?? item.signal_payload?.upgrade_implication ?? null,
    }))

    const grouped = new Map<string, { signal_type: string; tag: string; item_count: number; urgency: string; max_relevance: number }>()
    for (const item of analyzed as any[]) {
      const signalType = item.signal_type ?? item.signal_payload?.signal_type ?? 'demand-signal'
      const leadTag = Array.isArray(item.ai_tags) && item.ai_tags.length > 0 ? item.ai_tags[0] : 'uncategorized'
      const key = `${signalType}:${leadTag}`
      const current = grouped.get(key) ?? {
        signal_type: signalType,
        tag: leadTag,
        item_count: 0,
        urgency: item.signal_urgency ?? item.signal_payload?.urgency ?? 'monitor',
        max_relevance: 0,
      }
      current.item_count += 1
      current.max_relevance = Math.max(current.max_relevance, item.relevance_score ?? 0)
      if ((item.signal_urgency ?? item.signal_payload?.urgency) === 'urgent') current.urgency = 'urgent'
      grouped.set(key, current)
    }

    const tagCounts: Record<string, number> = {}
    for (const item of analyzed) {
      for (const tag of ((item as any).ai_tags || [])) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1
      }
    }

    const platforms = Array.from(new Set(items.map((item: any) => item.content_sources?.platform).filter(Boolean)))

    return {
      item_count: items.length,
      analyzed_count: analyzed.length,
      platforms,
      top_insights: topInsights,
      themes: Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([tag]) => tag),
      grouped_signals: Array.from(grouped.values()).sort((a, b) => (b.item_count + b.max_relevance) - (a.item_count + a.max_relevance)).slice(0, 8),
      transcript_coverage: {
        total_video_items: items.filter((item: any) => item.transcript_status && item.transcript_status !== 'not_applicable').length,
        completed: items.filter((item: any) => item.transcript_status === 'complete').length,
        failed: items.filter((item: any) => item.transcript_status === 'failed').length,
        pending: items.filter((item: any) => item.transcript_status === 'pending').length,
      },
      source_health: {
        active: items.filter((item: any) => item.content_sources?.status === 'active').length,
        error: items.filter((item: any) => item.content_sources?.status === 'error').length,
        paused: items.filter((item: any) => item.content_sources?.status === 'paused').length,
      },
      unresolved_failures: items
        .filter((item: any) => item.transcript_status === 'failed' || item.analysis_status === 'failed')
        .slice(0, 8)
        .map((item: any) => ({
          id: item.id,
          platform: item.content_sources?.platform,
          source_name: item.content_sources?.name,
          transcript_status: item.transcript_status,
          analysis_status: item.analysis_status,
        })),
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
