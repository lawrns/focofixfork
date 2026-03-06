import { NextRequest } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import {
  successResponse,
  authRequiredResponse,
  databaseErrorResponse,
} from '@/lib/api/response-helpers'
import { supabaseAdmin } from '@/lib/supabase-server'
import { resolveWorkspaceScope, scopeProjectIds } from '@/features/content-pipeline/server/workspace-scope'
import { getSourcePlatform } from '@/features/content-pipeline/server/source-record'
import { isMissingContentPipelineSchema } from '@/features/content-pipeline/server/schema-availability'

export const dynamic = 'force-dynamic'

function emptyInsightsPayload() {
  return {
    top_insights: [],
    themes: [],
    grouped_signals: [],
    platform_counts: {},
    total_items: 0,
    analyzed_count: 0,
    transcript_coverage: {
      total_video_items: 0,
      completed: 0,
      failed: 0,
      pending: 0,
    },
    source_health: {
      active: 0,
      error: 0,
      paused: 0,
    },
    unresolved_failures: [],
  }
}

/**
 * GET /api/content-pipeline/social/insights
 * Aggregated social intelligence for the caller's workspace scope.
 */
export async function GET(req: NextRequest) {
  try {
    const { user, error, response: authResponse } = await getAuthUser(req)
    if (error || !user) {
      return mergeAuthResponse(authRequiredResponse(), authResponse)
    }

    const { scope, error: scopeError } = await resolveWorkspaceScope(user.id)
    if (scopeError) {
      return mergeAuthResponse(databaseErrorResponse('Failed to resolve workspace scope', scopeError), authResponse)
    }

    const projectIds = scopeProjectIds(scope)
    if (projectIds.length === 0) {
      return mergeAuthResponse(successResponse(emptyInsightsPayload()), authResponse)
    }

    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()

    const { data: sources, error: sourceError } = await supabaseAdmin
      .from('content_sources')
      .select('*')
      .in('project_id', projectIds)

    if (sourceError) {
      if (isMissingContentPipelineSchema(sourceError)) {
        return mergeAuthResponse(successResponse(emptyInsightsPayload()), authResponse)
      }
      return mergeAuthResponse(databaseErrorResponse('Failed to fetch social sources', sourceError), authResponse)
    }

    const safeSources = (sources ?? []).filter((source: any) => Boolean(getSourcePlatform(source)))
    const sourceIds = safeSources.map((source: any) => source.id)

    if (sourceIds.length === 0) {
      return mergeAuthResponse(successResponse(emptyInsightsPayload()), authResponse)
    }

    const sourceById = new Map<string, { name: string | null; platform: string | null; url: string | null; status: string | null; last_error: string | null }>()
    for (const source of safeSources) {
      sourceById.set(source.id as string, {
        name: source.name ?? null,
        platform: getSourcePlatform(source),
        url: source.url ?? null,
        status: source.status ?? null,
        last_error: source.last_error ?? null,
      })
    }

    const { data: items, error: dbError } = await supabaseAdmin
      .from('content_items')
      .select(`
        id,
        title,
        ai_summary,
        ai_tags,
        relevance_score,
        published_at,
        created_at,
        source_id,
        transcript_status,
        download_status,
        analysis_status,
        analysis_error,
        signal_type,
        signal_confidence,
        signal_urgency,
        upgrade_implication,
        evidence_excerpt,
        signal_payload
      `)
      .in('source_id', sourceIds)
      .gte('created_at', cutoff)
      .order('relevance_score', { ascending: false })
      .limit(200)

    if (dbError) {
      if (isMissingContentPipelineSchema(dbError)) {
        return mergeAuthResponse(successResponse(emptyInsightsPayload()), authResponse)
      }
      return mergeAuthResponse(databaseErrorResponse('Failed to fetch social insights', dbError), authResponse)
    }

    const safeItems = items ?? []
    const analyzedItems = safeItems.filter((item: any) => Boolean(item.ai_summary) || item.analysis_status === 'complete')

    const topInsights = analyzedItems.slice(0, 20).map((item: any) => {
      const source = sourceById.get(item.source_id)
      const signal = item.signal_payload && typeof item.signal_payload === 'object' ? item.signal_payload : null
      return {
        id: item.id,
        summary: item.ai_summary,
        tags: item.ai_tags || [],
        relevance: item.relevance_score,
        platform: source?.platform ?? null,
        source_name: source?.name ?? null,
        source_url: source?.url ?? null,
        published_at: item.published_at || item.created_at,
        signal_type: item.signal_type ?? signal?.signal_type ?? null,
        urgency: item.signal_urgency ?? signal?.urgency ?? null,
        confidence: item.signal_confidence ?? signal?.confidence ?? item.relevance_score ?? null,
        upgrade_implication: item.upgrade_implication ?? signal?.upgrade_implication ?? null,
        evidence_excerpt: item.evidence_excerpt ?? signal?.evidence_excerpt ?? null,
      }
    })

    const tagCounts: Record<string, number> = {}
    for (const item of analyzedItems) {
      const tags = (item as any).ai_tags || []
      for (const tag of tags) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1
      }
    }

    const themes = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([tag, count]) => ({ tag, count }))

    const platformCounts: Record<string, number> = {}
    for (const item of safeItems) {
      const source = sourceById.get((item as any).source_id)
      const platform = source?.platform
      if (platform) platformCounts[platform] = (platformCounts[platform] || 0) + 1
    }

    const transcriptCoverage = {
      total_video_items: 0,
      completed: 0,
      failed: 0,
      pending: 0,
    }

    for (const item of safeItems as any[]) {
      if (item.download_status === 'not_applicable' && item.transcript_status === 'not_applicable') continue
      transcriptCoverage.total_video_items += 1
      if (item.transcript_status === 'complete') transcriptCoverage.completed += 1
      else if (item.transcript_status === 'failed') transcriptCoverage.failed += 1
      else transcriptCoverage.pending += 1
    }

    const sourceHealth = {
      active: safeSources.filter((source: any) => source.status === 'active').length,
      error: safeSources.filter((source: any) => source.status === 'error').length,
      paused: safeSources.filter((source: any) => source.status === 'paused').length,
    }

    const groupedSignalsMap = new Map<string, {
      signal_type: string
      tag: string
      item_count: number
      max_relevance: number
      max_confidence: number
      urgency: string
      summaries: string[]
      upgrade_implications: string[]
      source_names: string[]
    }>()

    for (const item of analyzedItems as any[]) {
      const signal = item.signal_payload && typeof item.signal_payload === 'object' ? item.signal_payload : null
      const signalType = item.signal_type ?? signal?.signal_type ?? 'demand-signal'
      const tags = Array.isArray(item.ai_tags) && item.ai_tags.length > 0
        ? item.ai_tags
        : Array.isArray(signal?.themes) && signal.themes.length > 0
          ? signal.themes
          : ['uncategorized']
      const leadTag = String(tags[0] ?? 'uncategorized')
      const key = `${signalType}:${leadTag}`
      const source = sourceById.get(item.source_id)
      const current = groupedSignalsMap.get(key) ?? {
        signal_type: signalType,
        tag: leadTag,
        item_count: 0,
        max_relevance: 0,
        max_confidence: 0,
        urgency: item.signal_urgency ?? signal?.urgency ?? 'monitor',
        summaries: [] as string[],
        upgrade_implications: [] as string[],
        source_names: [] as string[],
      }
      current.item_count += 1
      current.max_relevance = Math.max(current.max_relevance, item.relevance_score ?? 0)
      current.max_confidence = Math.max(current.max_confidence, item.signal_confidence ?? signal?.confidence ?? 0)
      if (current.summaries.length < 3 && typeof item.ai_summary === 'string') current.summaries.push(item.ai_summary)
      const implication = item.upgrade_implication ?? signal?.upgrade_implication
      if (current.upgrade_implications.length < 3 && typeof implication === 'string' && implication) {
        current.upgrade_implications.push(implication)
      }
      if (current.source_names.length < 4 && source?.name) current.source_names.push(source.name)
      if ((item.signal_urgency ?? signal?.urgency) === 'urgent') current.urgency = 'urgent'
      else if (current.urgency !== 'urgent' && (item.signal_urgency ?? signal?.urgency) === 'active') current.urgency = 'active'
      groupedSignalsMap.set(key, current)
    }

    const groupedSignals = Array.from(groupedSignalsMap.values())
      .sort((a, b) => {
        const scoreA = a.item_count * 0.2 + a.max_relevance + a.max_confidence
        const scoreB = b.item_count * 0.2 + b.max_relevance + b.max_confidence
        return scoreB - scoreA
      })
      .slice(0, 12)

    const unresolvedFailures = safeItems
      .filter((item: any) => item.transcript_status === 'failed' || item.analysis_status === 'failed')
      .slice(0, 12)
      .map((item: any) => {
        const source = sourceById.get(item.source_id)
        return {
          id: item.id,
          title: item.title,
          platform: source?.platform ?? null,
          source_name: source?.name ?? null,
          transcript_status: item.transcript_status,
          analysis_status: item.analysis_status,
          analysis_error: item.analysis_error ?? source?.last_error ?? null,
        }
      })

    const { count: totalItems, error: totalCountError } = await supabaseAdmin
      .from('content_items')
      .select('id', { count: 'exact', head: true })
      .in('source_id', sourceIds)
      .gte('created_at', cutoff)

    if (totalCountError) {
      if (isMissingContentPipelineSchema(totalCountError)) {
        return mergeAuthResponse(successResponse(emptyInsightsPayload()), authResponse)
      }
      return mergeAuthResponse(databaseErrorResponse('Failed to count social items', totalCountError), authResponse)
    }

    return mergeAuthResponse(
      successResponse({
        top_insights: topInsights,
        themes,
        grouped_signals: groupedSignals,
        platform_counts: platformCounts,
        total_items: totalItems ?? safeItems.length,
        analyzed_count: analyzedItems.length,
        transcript_coverage: transcriptCoverage,
        source_health: sourceHealth,
        unresolved_failures: unresolvedFailures,
      }),
      authResponse
    )
  } catch (err: unknown) {
    if (isMissingContentPipelineSchema(err)) {
      const { response: authResponse } = await getAuthUser(req)
      return mergeAuthResponse(successResponse(emptyInsightsPayload()), authResponse)
    }
    const message = err instanceof Error ? err.message : 'Unknown error'
    return databaseErrorResponse('Failed to fetch social insights', message)
  }
}
