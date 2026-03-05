import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper';
import {
  successResponse,
  authRequiredResponse,
  databaseErrorResponse,
} from '@/lib/api/response-helpers';
import { supabaseAdmin } from '@/lib/supabase-server';
import { buildApifyConfig, validateHandle, platformMeta } from '@/features/content-pipeline/services/social-config';
import type { SocialPlatform } from '@/features/content-pipeline/services/social-config';

export const dynamic = 'force-dynamic';

/**
 * GET /api/content-pipeline/social/sources
 * List social content sources (where platform IS NOT NULL)
 */
export async function GET(req: NextRequest) {
  try {
    const { user, error, response: authResponse } = await getAuthUser(req);
    if (error || !user) {
      return mergeAuthResponse(authRequiredResponse(), authResponse);
    }

    const { data: sources, error: dbError } = await supabaseAdmin
      .from('content_sources')
      .select('*, content_items(count)')
      .not('platform', 'is', null)
      .order('created_at', { ascending: false });

    if (dbError) {
      return databaseErrorResponse('Failed to fetch social sources', dbError);
    }

    // Flatten the count
    const result = (sources || []).map((s: any) => ({
      ...s,
      item_count: s.content_items?.[0]?.count ?? 0,
      content_items: undefined,
    }));

    return mergeAuthResponse(successResponse(result), authResponse);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return databaseErrorResponse('Failed to fetch social sources', message);
  }
}

/**
 * POST /api/content-pipeline/social/sources
 * Create a social content source from platform + handle
 */
export async function POST(req: NextRequest) {
  try {
    const { user, supabase, error, response: authResponse } = await getAuthUser(req);
    if (error || !user) {
      return mergeAuthResponse(authRequiredResponse(), authResponse);
    }

    const body = await req.json();
    const { platform, handle: rawHandle, name, poll_interval_minutes, project_id } = body;

    // Validate platform
    const validPlatforms: SocialPlatform[] = ['twitter', 'instagram', 'youtube'];
    if (!platform || !validPlatforms.includes(platform)) {
      return NextResponse.json(
        { error: `Invalid platform. Must be one of: ${validPlatforms.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate handle
    if (!rawHandle) {
      return NextResponse.json({ error: 'handle is required' }, { status: 400 });
    }

    const validation = validateHandle(platform, rawHandle);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // If project_id provided, verify ownership. Otherwise use first owned project.
    let resolvedProjectId = project_id;
    if (resolvedProjectId) {
      const { data: project } = await supabase
        .from('foco_projects')
        .select('id')
        .eq('id', resolvedProjectId)
        .eq('owner_id', user.id)
        .maybeSingle();
      if (!project) {
        return NextResponse.json({ error: 'Project not found or not owned by you' }, { status: 404 });
      }
    } else {
      const { data: projects } = await supabase
        .from('foco_projects')
        .select('id')
        .eq('owner_id', user.id)
        .limit(1);
      resolvedProjectId = projects?.[0]?.id;
      if (!resolvedProjectId) {
        return NextResponse.json({ error: 'No projects available. Create a project first.' }, { status: 400 });
      }
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
        platform,
        poll_interval_minutes: poll_interval_minutes || 120,
        headers: {},
        provider_config: apifyConfig,
        status: 'active',
      })
      .select()
      .single();

    if (createError) {
      return databaseErrorResponse('Failed to create social source', createError);
    }

    return mergeAuthResponse(successResponse(source, undefined, 201), authResponse);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return databaseErrorResponse('Failed to create social source', message);
  }
}

/**
 * DELETE /api/content-pipeline/social/sources
 * Delete a social source by ID
 */
export async function DELETE(req: NextRequest) {
  try {
    const { user, supabase, error, response: authResponse } = await getAuthUser(req);
    if (error || !user) {
      return mergeAuthResponse(authRequiredResponse(), authResponse);
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    // Verify ownership via project
    const { data: source } = await supabaseAdmin
      .from('content_sources')
      .select('id, project_id, foco_projects!inner(owner_id)')
      .eq('id', id)
      .maybeSingle();

    if (!source || (source as any).foco_projects?.owner_id !== user.id) {
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
