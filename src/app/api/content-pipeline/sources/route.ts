import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper';
import { 
  successResponse, 
  authRequiredResponse, 
  databaseErrorResponse,
  missingFieldResponse,
  notFoundResponse,
  isValidUUID,
} from '@/lib/api/response-helpers';
import { supabaseAdmin } from '@/lib/supabase-server';
import type { ContentSource } from '@/features/content-pipeline/types';

export const dynamic = 'force-dynamic';

/**
 * GET /api/content-pipeline/sources
 * List content sources for a project
 */
export async function GET(req: NextRequest) {
  try {
    const { user, supabase, error, response: authResponse } = await getAuthUser(req);

    if (error || !user) {
      return mergeAuthResponse(authRequiredResponse(), authResponse);
    }

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('project_id');

    if (!projectId) {
      return missingFieldResponse('project_id');
    }

    if (!isValidUUID(projectId)) {
      return missingFieldResponse('Invalid project_id format');
    }

    // Verify user has access to this project
    const { data: project, error: projectError } = await supabase
      .from('foco_projects')
      .select('id')
      .eq('id', projectId)
      .eq('owner_id', user.id)
      .maybeSingle();

    if (projectError) {
      return databaseErrorResponse('Failed to verify project access', projectError);
    }

    if (!project) {
      return notFoundResponse('Project', projectId);
    }

    // Fetch sources
    const { data: sources, error: sourcesError } = await supabase
      .from('content_sources')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (sourcesError) {
      return databaseErrorResponse('Failed to fetch content sources', sourcesError);
    }

    return mergeAuthResponse(successResponse(sources || []), authResponse);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return databaseErrorResponse('Failed to fetch content sources', message);
  }
}

/**
 * POST /api/content-pipeline/sources
 * Create a new content source
 */
export async function POST(req: NextRequest) {
  try {
    const { user, supabase, error, response: authResponse } = await getAuthUser(req);

    if (error || !user) {
      return mergeAuthResponse(authRequiredResponse(), authResponse);
    }

    const body = await req.json();

    // Validate required fields
    if (!body.project_id) {
      return missingFieldResponse('project_id');
    }

    if (!body.name) {
      return missingFieldResponse('name');
    }

    if (!body.url && body.type !== 'apify') {
      return missingFieldResponse('url');
    }

    if (!body.type) {
      return missingFieldResponse('type');
    }

    if (!isValidUUID(body.project_id)) {
      return missingFieldResponse('Invalid project_id format');
    }

    // Validate type
    const validTypes = ['rss', 'api', 'webhook', 'scrape', 'apify'];
    if (!validTypes.includes(body.type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Verify user has access to this project
    const { data: project, error: projectError } = await supabase
      .from('foco_projects')
      .select('id')
      .eq('id', body.project_id)
      .eq('owner_id', user.id)
      .maybeSingle();

    if (projectError) {
      return databaseErrorResponse('Failed to verify project access', projectError);
    }

    if (!project) {
      return notFoundResponse('Project', body.project_id);
    }

    // Create source using admin client to bypass RLS
    const { data: source, error: createError } = await supabaseAdmin
      .from('content_sources')
      .insert({
        project_id: body.project_id,
        name: body.name,
        url: body.url || 'https://api.apify.com',
        type: body.type,
        poll_interval_minutes: body.poll_interval_minutes || 60,
        headers: body.headers || {},
        provider_config: body.provider_config || {},
        webhook_secret: body.webhook_secret || null,
        status: body.status || 'active',
      })
      .select()
      .single();

    if (createError) {
      return databaseErrorResponse('Failed to create content source', createError);
    }

    return mergeAuthResponse(successResponse(source, undefined, 201), authResponse);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return databaseErrorResponse('Failed to create content source', message);
  }
}

/**
 * PUT /api/content-pipeline/sources
 * Update an existing content source
 */
export async function PUT(req: NextRequest) {
  try {
    const { user, supabase, error, response: authResponse } = await getAuthUser(req);

    if (error || !user) {
      return mergeAuthResponse(authRequiredResponse(), authResponse);
    }

    const body = await req.json();

    if (!body.id) {
      return missingFieldResponse('id');
    }

    if (!isValidUUID(body.id)) {
      return missingFieldResponse('Invalid id format');
    }

    // Verify user has access to this source (via project ownership)
    const { data: existingSource, error: sourceError } = await supabase
      .from('content_sources')
      .select('*, foco_projects!inner(owner_id)')
      .eq('id', body.id)
      .eq('foco_projects.owner_id', user.id)
      .maybeSingle();

    if (sourceError) {
      return databaseErrorResponse('Failed to verify source access', sourceError);
    }

    if (!existingSource) {
      return notFoundResponse('Content source', body.id);
    }

    // Build update object
    const updateData: Partial<ContentSource> = {
      updated_at: new Date().toISOString(),
    };

    if (body.name !== undefined) updateData.name = body.name;
    if (body.url !== undefined) updateData.url = body.url;
    if (body.type !== undefined) updateData.type = body.type;
    if (body.poll_interval_minutes !== undefined) updateData.poll_interval_minutes = body.poll_interval_minutes;
    if (body.headers !== undefined) updateData.headers = body.headers;
    if (body.provider_config !== undefined) (updateData as any).provider_config = body.provider_config;
    if (body.webhook_secret !== undefined) (updateData as any).webhook_secret = body.webhook_secret;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.last_error !== undefined) updateData.last_error = body.last_error;
    if (body.error_count !== undefined) updateData.error_count = body.error_count;

    // Update source using admin client
    const { data: source, error: updateError } = await supabaseAdmin
      .from('content_sources')
      .update(updateData)
      .eq('id', body.id)
      .select()
      .single();

    if (updateError) {
      return databaseErrorResponse('Failed to update content source', updateError);
    }

    return mergeAuthResponse(successResponse(source), authResponse);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return databaseErrorResponse('Failed to update content source', message);
  }
}

/**
 * DELETE /api/content-pipeline/sources
 * Delete a content source
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
      return missingFieldResponse('id');
    }

    if (!isValidUUID(id)) {
      return missingFieldResponse('Invalid id format');
    }

    // Verify user has access to this source (via project ownership)
    const { data: existingSource, error: sourceError } = await supabase
      .from('content_sources')
      .select('*, foco_projects!inner(owner_id)')
      .eq('id', id)
      .eq('foco_projects.owner_id', user.id)
      .maybeSingle();

    if (sourceError) {
      return databaseErrorResponse('Failed to verify source access', sourceError);
    }

    if (!existingSource) {
      return notFoundResponse('Content source', id);
    }

    // Delete source using admin client (cascade will delete items)
    const { error: deleteError } = await supabaseAdmin
      .from('content_sources')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return databaseErrorResponse('Failed to delete content source', deleteError);
    }

    return mergeAuthResponse(successResponse({ deleted: true }), authResponse);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return databaseErrorResponse('Failed to delete content source', message);
  }
}
