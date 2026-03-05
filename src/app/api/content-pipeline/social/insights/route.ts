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
    platform_counts: {},
    total_items: 0,
    analyzed_count: 0,
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

    const sourceById = new Map<string, { name: string | null; platform: string | null; url: string | null }>()
    for (const source of safeSources) {
      sourceById.set(source.id as string, {
        name: source.name ?? null,
        platform: getSourcePlatform(source),
        url: source.url ?? null,
      })
    }

    const { data: items, error: dbError } = await supabaseAdmin
      .from('content_items')
      .select('id, title, ai_summary, ai_tags, relevance_score, published_at, created_at, source_id')
      .in('source_id', sourceIds)
      .not('ai_summary', 'is', null)
      .gte('created_at', cutoff)
      .order('relevance_score', { ascending: false })
      .limit(50)

    if (dbError) {
      if (isMissingContentPipelineSchema(dbError)) {
        return mergeAuthResponse(successResponse(emptyInsightsPayload()), authResponse)
      }
      return mergeAuthResponse(databaseErrorResponse('Failed to fetch social insights', dbError), authResponse)
    }

    const safeItems = items ?? []

    const topInsights = safeItems.slice(0, 20).map((item: any) => {
      const source = sourceById.get(item.source_id)
      return {
        id: item.id,
        summary: item.ai_summary,
        tags: item.ai_tags || [],
        relevance: item.relevance_score,
        platform: source?.platform ?? null,
        source_name: source?.name ?? null,
        source_url: source?.url ?? null,
        published_at: item.published_at || item.created_at,
      }
    })

    const tagCounts: Record<string, number> = {}
    for (const item of safeItems) {
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
        platform_counts: platformCounts,
        total_items: totalItems ?? safeItems.length,
        analyzed_count: safeItems.length,
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
