import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper';
import { 
  successResponse, 
  authRequiredResponse, 
  databaseErrorResponse,
  missingFieldResponse,
  notFoundResponse,
  isValidUUID,
  createPaginationMeta,
} from '@/lib/api/response-helpers';
import { supabaseAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/content-pipeline/items
 * List content items with optional filtering
 */
export async function GET(req: NextRequest) {
  try {
    const { user, supabase, error, response: authResponse } = await getAuthUser(req);

    if (error || !user) {
      return mergeAuthResponse(authRequiredResponse(), authResponse);
    }

    const { searchParams } = new URL(req.url);
    const sourceId = searchParams.get('source_id');
    const status = searchParams.get('status');
    const projectId = searchParams.get('project_id');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query
    let query = supabase
      .from('content_items')
      .select('*, content_sources!inner(project_id, name, type)', { count: 'exact' });

    // Apply filters
    if (sourceId) {
      if (!isValidUUID(sourceId)) {
        return missingFieldResponse('Invalid source_id format');
      }
      query = query.eq('source_id', sourceId);
    }

    if (status) {
      const validStatuses = ['unread', 'read', 'archived', 'actioned'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
          { status: 400 }
        );
      }
      query = query.eq('status', status);
    }

    if (projectId) {
      if (!isValidUUID(projectId)) {
        return missingFieldResponse('Invalid project_id format');
      }
      query = query.eq('content_sources.project_id', projectId);
    }

    // Add ordering and pagination
    query = query
      .order('published_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: items, error: itemsError, count } = await query;

    if (itemsError) {
      return databaseErrorResponse('Failed to fetch content items', itemsError);
    }

    const meta = createPaginationMeta(count || 0, limit, offset);
    return mergeAuthResponse(successResponse(items || [], meta), authResponse);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return databaseErrorResponse('Failed to fetch content items', message);
  }
}

/**
 * PATCH /api/content-pipeline/items
 * Update content item status
 */
export async function PATCH(req: NextRequest) {
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

    if (!body.status) {
      return missingFieldResponse('status');
    }

    const validStatuses = ['unread', 'read', 'archived', 'actioned'];
    if (!validStatuses.includes(body.status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    // Verify user has access to this item (via source -> project ownership)
    const { data: existingItem, error: itemError } = await supabase
      .from('content_items')
      .select('*, content_sources!inner(project_id, foco_projects!inner(owner_id))')
      .eq('id', body.id)
      .eq('foco_projects.owner_id', user.id)
      .maybeSingle();

    if (itemError) {
      return databaseErrorResponse('Failed to verify item access', itemError);
    }

    if (!existingItem) {
      return notFoundResponse('Content item', body.id);
    }

    // Update item using admin client
    const { data: item, error: updateError } = await supabaseAdmin
      .from('content_items')
      .update({
        status: body.status,
      })
      .eq('id', body.id)
      .select()
      .single();

    if (updateError) {
      return databaseErrorResponse('Failed to update content item', updateError);
    }

    return mergeAuthResponse(successResponse(item), authResponse);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return databaseErrorResponse('Failed to update content item', message);
  }
}
