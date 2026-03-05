import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper';
import { 
  successResponse, 
  authRequiredResponse, 
  databaseErrorResponse,
  forbiddenResponse,
} from '@/lib/api/response-helpers';
import { supabaseAdmin } from '@/lib/supabase-server';
import { SourcePoller } from '@/features/content-pipeline/services/source-poller';
import { logger } from '@/lib/logger';
import { resolveWorkspaceScope, scopeProjectIds } from '@/features/content-pipeline/server/workspace-scope';

export const dynamic = 'force-dynamic';

// Cron secret for automated polling
const CRON_SECRET = process.env.CRON_SECRET;

/**
 * POST /api/content-pipeline/poll
 * Trigger polling for content sources
 * 
 * Can be called:
 * 1. By authenticated user (polls sources they have access to)
 * 2. By cron job with x-cron-secret header (polls all active sources)
 */
export async function POST(req: NextRequest) {
  try {
    // Check for cron secret first
    const cronSecret = req.headers.get('x-cron-secret');
    const isCron = cronSecret && CRON_SECRET && cronSecret === CRON_SECRET;

    let userId: string | null = null;
    let allowedProjectIds: string[] = [];

    if (!isCron) {
      // Must be authenticated
      const { user, error, response: authResponse } = await getAuthUser(req);

      if (error || !user) {
        return mergeAuthResponse(authRequiredResponse(), authResponse);
      }

      userId = user.id;

      const { scope, error: scopeError } = await resolveWorkspaceScope(user.id);
      if (scopeError) {
        return databaseErrorResponse('Failed to resolve workspace scope', scopeError);
      }
      allowedProjectIds = scopeProjectIds(scope);
    }

    const { searchParams } = new URL(req.url);
    const sourceId = searchParams.get('source_id');
    const projectId = searchParams.get('project_id');

    // Build query for sources to poll
    let query = supabaseAdmin
      .from('content_sources')
      .select('*')
      .eq('status', 'active');

    // Apply filters
    if (sourceId) {
      query = query.eq('id', sourceId);
    }

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    // If not cron, restrict to user's projects
    if (!isCron && userId) {
      if (allowedProjectIds.length === 0) {
        return successResponse({
          message: 'No accessible projects found to poll',
          results: [],
        });
      }
      query = query.in('project_id', allowedProjectIds);
    }

    const { data: sources, error: sourcesError } = await query;

    if (sourcesError) {
      return databaseErrorResponse('Failed to fetch content sources', sourcesError);
    }

    if (!sources || sources.length === 0) {
      return successResponse({
        message: 'No active sources found to poll',
        results: [],
      });
    }

    // Poll each source
    const results = [];
    for (const source of sources) {
      logger.info(`Polling source: ${source.name} (${source.id})`);
      const result = await SourcePoller.pollSource(source);
      results.push({
        sourceId: source.id,
        sourceName: source.name,
        ...result,
      });
    }

    const totalProcessed = results.reduce((sum, r) => sum + r.itemsProcessed, 0);
    const totalNew = results.reduce((sum, r) => sum + r.itemsNew, 0);
    const errors = results.filter(r => !r.success);

    return successResponse({
      message: `Polled ${sources.length} sources`,
      summary: {
        totalSources: sources.length,
        totalProcessed,
        totalNew,
        errors: errors.length,
      },
      results,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Error in poll endpoint:', message);
    return databaseErrorResponse('Failed to poll content sources', message);
  }
}

/**
 * GET /api/content-pipeline/poll
 * Get poll status (for cron health checks)
 */
export async function GET(req: NextRequest) {
  try {
    // Check for cron secret
    const cronSecret = req.headers.get('x-cron-secret');
    const isCron = cronSecret && CRON_SECRET && cronSecret === CRON_SECRET;

    if (!isCron) {
      // Must be authenticated
      const { user, error, response: authResponse } = await getAuthUser(req);

      if (error || !user) {
        return mergeAuthResponse(authRequiredResponse(), authResponse);
      }
    }

    // Get source statistics
    const { data: stats, error: statsError } = await supabaseAdmin
      .from('content_sources')
      .select('status', { count: 'exact' });

    if (statsError) {
      return databaseErrorResponse('Failed to fetch poll status', statsError);
    }

    const statusCounts = (stats || []).reduce((acc: Record<string, number>, s: { status: string }) => {
      acc[s.status] = (acc[s.status] || 0) + 1;
      return acc;
    }, {});

    const { count: totalItems } = await supabaseAdmin
      .from('content_items')
      .select('*', { count: 'exact', head: true });

    const { count: unreadItems } = await supabaseAdmin
      .from('content_items')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'unread');

    return successResponse({
      status: 'healthy',
      sources: statusCounts,
      items: {
        total: totalItems || 0,
        unread: unreadItems || 0,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return databaseErrorResponse('Failed to get poll status', message);
  }
}
