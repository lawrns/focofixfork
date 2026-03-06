import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper';
import {
  successResponse,
  authRequiredResponse,
  databaseErrorResponse,
  badRequestResponse,
} from '@/lib/api/response-helpers';
import { supabaseAdmin } from '@/lib/supabase-server';
import { buildApifyConfig, validateHandle, platformMeta } from '@/features/content-pipeline/services/social-config';
import type { SocialPlatform } from '@/features/content-pipeline/services/social-config';
import {
  ensureWorkspaceRootProject,
  hasProjectAccess,
  resolveWorkspaceScope,
  scopeProjectIds,
} from '@/features/content-pipeline/server/workspace-scope';
import { getSourcePlatform, mergeSourceHeaders } from '@/features/content-pipeline/server/source-record';
import { isMissingContentPipelineSchema } from '@/features/content-pipeline/server/schema-availability';

export const dynamic = 'force-dynamic';

/**
 * GET /api/content-pipeline/social/sources
 * List social content sources for all projects user can access.
 */
export async function GET(req: NextRequest) {
  try {
    const { user, error, response: authResponse } = await getAuthUser(req);
    if (error || !user) {
      return mergeAuthResponse(authRequiredResponse(), authResponse);
    }

    const { scope, error: scopeError } = await resolveWorkspaceScope(user.id);
    if (scopeError) {
      return databaseErrorResponse('Failed to resolve workspace scope', scopeError);
    }

    const projectIds = scopeProjectIds(scope);
    if (projectIds.length === 0) {
      return mergeAuthResponse(successResponse([]), authResponse);
    }

    const { data: sources, error: dbError } = await supabaseAdmin
      .from('content_sources')
      .select('*')
      .in('project_id', projectIds)
      .order('created_at', { ascending: false });

    if (dbError) {
      if (isMissingContentPipelineSchema(dbError)) {
        return mergeAuthResponse(successResponse([]), authResponse);
      }
      return databaseErrorResponse('Failed to fetch social sources', dbError);
    }

    const socialSources = (sources || [])
      .filter((source: any) => Boolean(getSourcePlatform(source)))
    const counts = await Promise.all(
      socialSources.map(async (source: any) => {
        const { count, error } = await supabaseAdmin
          .from('content_items')
          .select('id', { count: 'exact', head: true })
          .eq('source_id', source.id)

        if (error) {
          if (isMissingContentPipelineSchema(error)) {
            return [source.id, 0] as const
          }
          throw error
        }

        return [source.id, count ?? 0] as const
      })
    )

    const countBySourceId = new Map<string, number>(counts)
    const latestRuns = await Promise.all(
      socialSources.map(async (source: any) => {
        const { data: run, error } = await supabaseAdmin
          .from('apify_runs')
          .select('id, status, metrics, started_at, completed_at, error')
          .eq('source_id', source.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (error) throw error
        return [source.id, run] as const
      })
    )

    const latestRunBySourceId = new Map<string, any>(latestRuns)

    const result = socialSources.map((source: any) => ({
      ...source,
      platform: getSourcePlatform(source),
      item_count: countBySourceId.get(source.id) ?? 0,
      latest_run: latestRunBySourceId.get(source.id) ?? null,
    }));

    return mergeAuthResponse(successResponse(result), authResponse);
  } catch (err: unknown) {
    if (isMissingContentPipelineSchema(err)) {
      const { response: authResponse } = await getAuthUser(req);
      return mergeAuthResponse(successResponse([]), authResponse);
    }
    const message = err instanceof Error ? err.message : 'Unknown error';
    return databaseErrorResponse('Failed to fetch social sources', message);
  }
}

/**
 * POST /api/content-pipeline/social/sources
 * Create a social content source from platform + handle.
 */
export async function POST(req: NextRequest) {
  try {
    const { user, error, response: authResponse } = await getAuthUser(req);
    if (error || !user) {
      return mergeAuthResponse(authRequiredResponse(), authResponse);
    }

    const body = await req.json();
    const { platform, handle: rawHandle, name, poll_interval_minutes, project_id } = body;

    const validPlatforms: SocialPlatform[] = ['twitter', 'instagram', 'youtube'];
    if (!platform || !validPlatforms.includes(platform)) {
      return badRequestResponse(`Invalid platform. Must be one of: ${validPlatforms.join(', ')}`);
    }

    if (!rawHandle) {
      return badRequestResponse('handle is required');
    }

    const validation = validateHandle(platform, rawHandle);
    if (!validation.valid) {
      return badRequestResponse(validation.error || 'Invalid handle');
    }

    const { scope, error: scopeError } = await resolveWorkspaceScope(user.id);
    if (scopeError) {
      return databaseErrorResponse('Failed to resolve workspace scope', scopeError);
    }

    if (scope.workspaceIds.length === 0) {
      return badRequestResponse('No workspace membership found. Join or create a workspace first.');
    }

    let resolvedProjectId = typeof project_id === 'string' ? project_id : '';

    if (resolvedProjectId) {
      if (!hasProjectAccess(scope, resolvedProjectId)) {
        return NextResponse.json({ error: 'Project not found or not accessible in your workspace' }, { status: 404 });
      }
    } else if (scope.projects.length > 0) {
      resolvedProjectId = scope.projects[0].id;
    } else {
      const createdRoot = await ensureWorkspaceRootProject(scope.workspaceIds[0], user.id);
      resolvedProjectId = createdRoot.id;
    }

    const meta = platformMeta[platform as SocialPlatform];
    const apifyConfig = buildApifyConfig(platform as SocialPlatform, validation.handle);
    const sourceName = name || `${meta.label}: @${validation.handle}`;
    const sourceUrl = meta.urlPattern.replace('{handle}', validation.handle);

    const { data: source, error: createError } = await supabaseAdmin
      .from('content_sources')
      .insert({
        project_id: resolvedProjectId,
        name: sourceName,
        url: sourceUrl,
        type: 'apify',
        poll_interval_minutes: poll_interval_minutes || 120,
        headers: mergeSourceHeaders({}, {
          platform,
          providerConfig: apifyConfig as unknown as Record<string, unknown>,
        }),
        status: 'active',
      })
      .select()
      .single();

    if (createError) {
      if (isMissingContentPipelineSchema(createError)) {
        return mergeAuthResponse(
          badRequestResponse('Content pipeline schema is not installed in this environment yet. Apply the content pipeline migrations first.'),
          authResponse
        );
      }
      return databaseErrorResponse('Failed to create social source', createError);
    }

    return mergeAuthResponse(successResponse(source, undefined, 201), authResponse);
  } catch (err: unknown) {
    if (isMissingContentPipelineSchema(err)) {
      const { response: authResponse } = await getAuthUser(req);
      return mergeAuthResponse(
        badRequestResponse('Content pipeline schema is not installed in this environment yet. Apply the content pipeline migrations first.'),
        authResponse
      );
    }
    const message = err instanceof Error ? err.message : 'Unknown error';
    return databaseErrorResponse('Failed to create social source', message);
  }
}

/**
 * DELETE /api/content-pipeline/social/sources
 * Delete a social source by ID.
 */
export async function DELETE(req: NextRequest) {
  try {
    const { user, error, response: authResponse } = await getAuthUser(req);
    if (error || !user) {
      return mergeAuthResponse(authRequiredResponse(), authResponse);
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return badRequestResponse('id is required');
    }

    const { scope, error: scopeError } = await resolveWorkspaceScope(user.id);
    if (scopeError) {
      return databaseErrorResponse('Failed to resolve workspace scope', scopeError);
    }

    const projectIds = scopeProjectIds(scope);
    if (projectIds.length === 0) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    const { data: source, error: sourceError } = await supabaseAdmin
      .from('content_sources')
      .select('id, project_id')
      .eq('id', id)
      .in('project_id', projectIds)
      .maybeSingle();

    if (sourceError) {
      return databaseErrorResponse('Failed to verify source access', sourceError);
    }

    if (!source) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    const { error: deleteError } = await supabaseAdmin
      .from('content_sources')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return databaseErrorResponse('Failed to delete social source', deleteError);
    }

    return mergeAuthResponse(successResponse({ deleted: true }), authResponse);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return databaseErrorResponse('Failed to delete social source', message);
  }
}
