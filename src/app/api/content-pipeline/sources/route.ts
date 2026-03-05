import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import {
  successResponse,
  authRequiredResponse,
  databaseErrorResponse,
  missingFieldResponse,
  notFoundResponse,
  isValidUUID,
} from '@/lib/api/response-helpers'
import { supabaseAdmin } from '@/lib/supabase-server'
import type { ContentSource } from '@/features/content-pipeline/types'
import { hasProjectAccess, resolveWorkspaceScope, scopeProjectIds } from '@/features/content-pipeline/server/workspace-scope'
import { getSourceHeaders, getSourcePlatform, getSourceProviderConfig, getSourceWebhookSecret, mergeSourceHeaders } from '@/features/content-pipeline/server/source-record'

export const dynamic = 'force-dynamic'

/**
 * GET /api/content-pipeline/sources
 * List content sources for a project.
 */
export async function GET(req: NextRequest) {
  try {
    const { user, error, response: authResponse } = await getAuthUser(req)

    if (error || !user) {
      return mergeAuthResponse(authRequiredResponse(), authResponse)
    }

    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('project_id')

    if (!projectId) {
      return missingFieldResponse('project_id')
    }

    if (!isValidUUID(projectId)) {
      return missingFieldResponse('Invalid project_id format')
    }

    const { scope, error: scopeError } = await resolveWorkspaceScope(user.id)
    if (scopeError) {
      return mergeAuthResponse(databaseErrorResponse('Failed to resolve workspace scope', scopeError), authResponse)
    }

    if (!hasProjectAccess(scope, projectId)) {
      return mergeAuthResponse(notFoundResponse('Project', projectId), authResponse)
    }

    const { data: sources, error: sourcesError } = await supabaseAdmin
      .from('content_sources')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (sourcesError) {
      return mergeAuthResponse(databaseErrorResponse('Failed to fetch content sources', sourcesError), authResponse)
    }

    return mergeAuthResponse(successResponse((sources || []).map((source: any) => ({
      ...source,
      headers: getSourceHeaders(source),
      platform: getSourcePlatform(source),
      provider_config: getSourceProviderConfig(source),
      webhook_secret: getSourceWebhookSecret(source),
    }))), authResponse)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return databaseErrorResponse('Failed to fetch content sources', message)
  }
}

/**
 * POST /api/content-pipeline/sources
 * Create a new content source.
 */
export async function POST(req: NextRequest) {
  try {
    const { user, error, response: authResponse } = await getAuthUser(req)

    if (error || !user) {
      return mergeAuthResponse(authRequiredResponse(), authResponse)
    }

    const body = await req.json()

    if (!body.project_id) {
      return missingFieldResponse('project_id')
    }

    if (!body.name) {
      return missingFieldResponse('name')
    }

    if (!body.url && body.type !== 'apify') {
      return missingFieldResponse('url')
    }

    if (!body.type) {
      return missingFieldResponse('type')
    }

    if (!isValidUUID(body.project_id)) {
      return missingFieldResponse('Invalid project_id format')
    }

    const validTypes = ['rss', 'api', 'webhook', 'scrape', 'apify']
    if (!validTypes.includes(body.type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    const { scope, error: scopeError } = await resolveWorkspaceScope(user.id)
    if (scopeError) {
      return mergeAuthResponse(databaseErrorResponse('Failed to resolve workspace scope', scopeError), authResponse)
    }

    if (!hasProjectAccess(scope, body.project_id)) {
      return mergeAuthResponse(notFoundResponse('Project', body.project_id), authResponse)
    }

    const { data: source, error: createError } = await supabaseAdmin
      .from('content_sources')
      .insert({
        project_id: body.project_id,
        name: body.name,
        url: body.url || 'https://api.apify.com',
        type: body.type,
        poll_interval_minutes: body.poll_interval_minutes || 60,
        headers: mergeSourceHeaders(body.headers || {}, {
          platform: typeof body.platform === 'string' ? body.platform : null,
          providerConfig: body.provider_config || null,
          webhookSecret: typeof body.webhook_secret === 'string' ? body.webhook_secret : null,
        }),
        status: body.status || 'active',
      })
      .select()
      .single()

    if (createError) {
      return mergeAuthResponse(databaseErrorResponse('Failed to create content source', createError), authResponse)
    }

    return mergeAuthResponse(successResponse({
      ...source,
      headers: getSourceHeaders(source),
      platform: getSourcePlatform(source),
      provider_config: getSourceProviderConfig(source),
      webhook_secret: getSourceWebhookSecret(source),
    }, undefined, 201), authResponse)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return databaseErrorResponse('Failed to create content source', message)
  }
}

/**
 * PUT /api/content-pipeline/sources
 * Update an existing content source.
 */
export async function PUT(req: NextRequest) {
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

    const { scope, error: scopeError } = await resolveWorkspaceScope(user.id)
    if (scopeError) {
      return mergeAuthResponse(databaseErrorResponse('Failed to resolve workspace scope', scopeError), authResponse)
    }

    const projectIds = scopeProjectIds(scope)
    if (projectIds.length === 0) {
      return mergeAuthResponse(notFoundResponse('Content source', body.id), authResponse)
    }

    const { data: existingSource, error: sourceError } = await supabaseAdmin
      .from('content_sources')
      .select('*')
      .eq('id', body.id)
      .in('project_id', projectIds)
      .maybeSingle()

    if (sourceError) {
      return mergeAuthResponse(databaseErrorResponse('Failed to verify source access', sourceError), authResponse)
    }

    if (!existingSource) {
      return mergeAuthResponse(notFoundResponse('Content source', body.id), authResponse)
    }

    const updateData: Partial<ContentSource> = {
      updated_at: new Date().toISOString(),
    }

    if (body.name !== undefined) updateData.name = body.name
    if (body.url !== undefined) updateData.url = body.url
    if (body.type !== undefined) updateData.type = body.type
    if (body.poll_interval_minutes !== undefined) updateData.poll_interval_minutes = body.poll_interval_minutes
    const existingHeaders = existingSource && 'headers' in existingSource ? (existingSource as any).headers : undefined
    if (body.headers !== undefined || body.provider_config !== undefined || body.webhook_secret !== undefined || body.platform !== undefined) {
      updateData.headers = mergeSourceHeaders(body.headers !== undefined ? body.headers : existingHeaders, {
        platform: body.platform !== undefined ? (typeof body.platform === 'string' ? body.platform : null) : getSourcePlatform({ headers: existingHeaders }),
        providerConfig: body.provider_config !== undefined ? body.provider_config : getSourceProviderConfig({ headers: existingHeaders }),
        webhookSecret: body.webhook_secret !== undefined ? body.webhook_secret : getSourceWebhookSecret({ headers: existingHeaders }),
      }) as Record<string, string>
    }
    if (body.status !== undefined) updateData.status = body.status
    if (body.last_error !== undefined) updateData.last_error = body.last_error
    if (body.error_count !== undefined) updateData.error_count = body.error_count

    const { data: source, error: updateError } = await supabaseAdmin
      .from('content_sources')
      .update(updateData)
      .eq('id', body.id)
      .select()
      .single()

    if (updateError) {
      return mergeAuthResponse(databaseErrorResponse('Failed to update content source', updateError), authResponse)
    }

    return mergeAuthResponse(successResponse({
      ...source,
      headers: getSourceHeaders(source),
      platform: getSourcePlatform(source),
      provider_config: getSourceProviderConfig(source),
      webhook_secret: getSourceWebhookSecret(source),
    }), authResponse)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return databaseErrorResponse('Failed to update content source', message)
  }
}

/**
 * DELETE /api/content-pipeline/sources
 * Delete a content source.
 */
export async function DELETE(req: NextRequest) {
  try {
    const { user, error, response: authResponse } = await getAuthUser(req)

    if (error || !user) {
      return mergeAuthResponse(authRequiredResponse(), authResponse)
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return missingFieldResponse('id')
    }

    if (!isValidUUID(id)) {
      return missingFieldResponse('Invalid id format')
    }

    const { scope, error: scopeError } = await resolveWorkspaceScope(user.id)
    if (scopeError) {
      return mergeAuthResponse(databaseErrorResponse('Failed to resolve workspace scope', scopeError), authResponse)
    }

    const projectIds = scopeProjectIds(scope)
    if (projectIds.length === 0) {
      return mergeAuthResponse(notFoundResponse('Content source', id), authResponse)
    }

    const { data: existingSource, error: sourceError } = await supabaseAdmin
      .from('content_sources')
      .select('id, project_id')
      .eq('id', id)
      .in('project_id', projectIds)
      .maybeSingle()

    if (sourceError) {
      return mergeAuthResponse(databaseErrorResponse('Failed to verify source access', sourceError), authResponse)
    }

    if (!existingSource) {
      return mergeAuthResponse(notFoundResponse('Content source', id), authResponse)
    }

    const { error: deleteError } = await supabaseAdmin
      .from('content_sources')
      .delete()
      .eq('id', id)

    if (deleteError) {
      return mergeAuthResponse(databaseErrorResponse('Failed to delete content source', deleteError), authResponse)
    }

    return mergeAuthResponse(successResponse({ deleted: true }), authResponse)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return databaseErrorResponse('Failed to delete content source', message)
  }
}
