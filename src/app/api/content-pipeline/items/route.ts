import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import {
  successResponse,
  authRequiredResponse,
  databaseErrorResponse,
  missingFieldResponse,
  notFoundResponse,
  isValidUUID,
  createPaginationMeta,
} from '@/lib/api/response-helpers'
import { supabaseAdmin } from '@/lib/supabase-server'
import { resolveWorkspaceScope, scopeProjectIds, hasProjectAccess } from '@/features/content-pipeline/server/workspace-scope'
import { getSourceHeaders, getSourcePlatform } from '@/features/content-pipeline/server/source-record'

export const dynamic = 'force-dynamic'

/**
 * GET /api/content-pipeline/items
 * List content items with optional filtering.
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
      const meta = createPaginationMeta(0, 50, 0)
      return mergeAuthResponse(successResponse([], meta), authResponse)
    }

    const { searchParams } = new URL(req.url)
    const sourceId = searchParams.get('source_id')
    const status = searchParams.get('status')
    const projectId = searchParams.get('project_id')
    const limit = Math.max(1, Math.min(parseInt(searchParams.get('limit') || '50', 10), 200))
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10))

    if (sourceId && !isValidUUID(sourceId)) {
      return missingFieldResponse('Invalid source_id format')
    }

    if (projectId && !isValidUUID(projectId)) {
      return missingFieldResponse('Invalid project_id format')
    }

    if (projectId && !hasProjectAccess(scope, projectId)) {
      return mergeAuthResponse(notFoundResponse('Project', projectId), authResponse)
    }

    if (status) {
      const validStatuses = ['unread', 'read', 'archived', 'actioned']
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
          { status: 400 }
        )
      }
    }

    const scopedProjectIds = projectId ? [projectId] : projectIds

    const { data: scopedSources, error: sourcesError } = await supabaseAdmin
      .from('content_sources')
      .select('*')
      .in('project_id', scopedProjectIds)

    if (sourcesError) {
      return mergeAuthResponse(databaseErrorResponse('Failed to resolve source access', sourcesError), authResponse)
    }

    const sources = scopedSources ?? []
    const sourceById = new Map<string, any>()
    for (const source of sources) {
      sourceById.set(source.id as string, source)
    }

    if (sourceId && !sourceById.has(sourceId)) {
      return mergeAuthResponse(notFoundResponse('Content source', sourceId), authResponse)
    }

    const allowedSourceIds = sourceId ? [sourceId] : Array.from(sourceById.keys())
    if (allowedSourceIds.length === 0) {
      const meta = createPaginationMeta(0, limit, offset)
      return mergeAuthResponse(successResponse([], meta), authResponse)
    }

    let query = supabaseAdmin
      .from('content_items')
      .select('*', { count: 'exact' })
      .in('source_id', allowedSourceIds)

    if (status) {
      query = query.eq('status', status)
    }

    const { data: items, error: itemsError, count } = await query
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (itemsError) {
      return mergeAuthResponse(databaseErrorResponse('Failed to fetch content items', itemsError), authResponse)
    }

    const enrichedItems = (items ?? []).map((item: any) => ({
      ...item,
      content_sources: sourceById.has(item.source_id)
        ? (() => {
            const source = sourceById.get(item.source_id);
            return {
              ...source,
              headers: getSourceHeaders(source),
              platform: getSourcePlatform(source),
            };
          })()
        : null,
    }))

    const meta = createPaginationMeta(count || 0, limit, offset)
    return mergeAuthResponse(successResponse(enrichedItems, meta), authResponse)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return databaseErrorResponse('Failed to fetch content items', message)
  }
}

/**
 * PATCH /api/content-pipeline/items
 * Update content item status
 */
export async function PATCH(req: NextRequest) {
  try {
    const { user, error, response: authResponse } = await getAuthUser(req)

    if (error || !user) {
      return mergeAuthResponse(authRequiredResponse(), authResponse)
    }

    const body = await req.json()

    if (!body.id) {
      return missingFieldResponse('id')
    }

    if (!isValidUUID(body.id)) {
      return missingFieldResponse('Invalid id format')
    }

    if (!body.status) {
      return missingFieldResponse('status')
    }

    const validStatuses = ['unread', 'read', 'archived', 'actioned']
    if (!validStatuses.includes(body.status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    const { scope, error: scopeError } = await resolveWorkspaceScope(user.id)
    if (scopeError) {
      return mergeAuthResponse(databaseErrorResponse('Failed to resolve workspace scope', scopeError), authResponse)
    }

    const projectIds = scopeProjectIds(scope)
    if (projectIds.length === 0) {
      return mergeAuthResponse(notFoundResponse('Content item', body.id), authResponse)
    }

    const { data: existingItem, error: itemError } = await supabaseAdmin
      .from('content_items')
      .select('id, source_id')
      .eq('id', body.id)
      .maybeSingle()

    if (itemError) {
      return mergeAuthResponse(databaseErrorResponse('Failed to verify item access', itemError), authResponse)
    }

    if (!existingItem?.source_id) {
      return mergeAuthResponse(notFoundResponse('Content item', body.id), authResponse)
    }

    const { data: source, error: sourceError } = await supabaseAdmin
      .from('content_sources')
      .select('id, project_id')
      .eq('id', existingItem.source_id)
      .in('project_id', projectIds)
      .maybeSingle()

    if (sourceError) {
      return mergeAuthResponse(databaseErrorResponse('Failed to verify item source access', sourceError), authResponse)
    }

    if (!source) {
      return mergeAuthResponse(notFoundResponse('Content item', body.id), authResponse)
    }

    const { data: item, error: updateError } = await supabaseAdmin
      .from('content_items')
      .update({
        status: body.status,
      })
      .eq('id', body.id)
      .select()
      .single()

    if (updateError) {
      return mergeAuthResponse(databaseErrorResponse('Failed to update content item', updateError), authResponse)
    }

    return mergeAuthResponse(successResponse(item), authResponse)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return databaseErrorResponse('Failed to update content item', message)
  }
}
