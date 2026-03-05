import { NextRequest } from 'next/server';
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper';
import {
  successResponse,
  authRequiredResponse,
  databaseErrorResponse,
} from '@/lib/api/response-helpers';
import { supabaseAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/content-pipeline/social/insights
 * Aggregated social intelligence: top items, themes, platform counts
 */
export async function GET(req: NextRequest) {
  try {
    const { user, error, response: authResponse } = await getAuthUser(req);
    if (error || !user) {
      return mergeAuthResponse(authRequiredResponse(), authResponse);
    }

    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    // Fetch analyzed social items from last 48h
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
        content_sources!inner(name, platform, url)
      `)
      .not('content_sources.platform', 'is', null)
      .not('ai_summary', 'is', null)
      .gte('created_at', cutoff)
      .order('relevance_score', { ascending: false })
      .limit(50);

    if (dbError) {
      return databaseErrorResponse('Failed to fetch social insights', dbError);
    }

    const safeItems = items || [];

    // Build top insights (top 20)
    const topInsights = safeItems.slice(0, 20).map((item: any) => ({
      id: item.id,
      summary: item.ai_summary,
      tags: item.ai_tags || [],
      relevance: item.relevance_score,
      platform: item.content_sources?.platform,
      source_name: item.content_sources?.name,
      source_url: item.content_sources?.url,
      published_at: item.published_at || item.created_at,
    }));

    // Aggregate themes (most common tags)
    const tagCounts: Record<string, number> = {};
    for (const item of safeItems) {
      const tags = (item as any).ai_tags || [];
      for (const tag of tags) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    }
    const themes = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([tag, count]) => ({ tag, count }));

    // Platform counts
    const platformCounts: Record<string, number> = {};
    for (const item of safeItems) {
      const p = (item as any).content_sources?.platform;
      if (p) platformCounts[p] = (platformCounts[p] || 0) + 1;
    }

    // Total social items (including unanalyzed)
    const { count: totalItems } = await supabaseAdmin
      .from('content_items')
      .select('id', { count: 'exact', head: true })
      .not('content_sources.platform', 'is', null)
      .gte('created_at', cutoff);

    return mergeAuthResponse(
      successResponse({
        top_insights: topInsights,
        themes,
        platform_counts: platformCounts,
        total_items: totalItems ?? safeItems.length,
        analyzed_count: safeItems.length,
      }),
      authResponse
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return databaseErrorResponse('Failed to fetch social insights', message);
  }
}
