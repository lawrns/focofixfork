import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'

import { ProjectRepository } from '@/lib/repositories/project-repository'
import type { UpdateProjectData } from '@/lib/repositories/project-repository'
import { isError } from '@/lib/repositories/base-repository'
import { authRequiredResponse, successResponse, databaseErrorResponse, projectNotFoundResponse, validateUUID } from '@/lib/api/response-helpers'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, supabase, error, response: authResponse } = await getAuthUser(req)

    if (error || !user) {
      return mergeAuthResponse(authRequiredResponse(), authResponse)
    }

    const { id } = await params
    const repo = new ProjectRepository(supabase)

    // Try to find by ID first
    let result = await repo.findById(id)

    // If not found and ID doesn't look like UUID, try by slug
    if (isError(result) && result.error.code === 'NOT_FOUND') {
      // Extract workspace_id from query params for slug lookup
      const { searchParams } = new URL(req.url)
      const workspaceId = searchParams.get('workspace_id')

      if (workspaceId) {
        result = await repo.findBySlug(workspaceId, id)
      }
    }

    if (isError(result)) {
      if (result.error.code === 'NOT_FOUND') {
        return mergeAuthResponse(projectNotFoundResponse(id), authResponse)
      }
      return mergeAuthResponse(databaseErrorResponse(result.error.message, result.error.details), authResponse)
    }

    return mergeAuthResponse(successResponse(result.data), authResponse)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return databaseErrorResponse('Failed to fetch project', message)
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, supabase, error, response: authResponse } = await getAuthUser(req)

    if (error || !user) {
      return mergeAuthResponse(authRequiredResponse(), authResponse)
    }

    const { id } = await params
    
    // Validate UUID format
    const uuidError = validateUUID('id', id)
    if (uuidError) {
      return uuidError
    }

    const body = await req.json()
    const repo = new ProjectRepository(supabase)

    // Build update object with only provided fields
    const updateData: UpdateProjectData = {}

    if (body.name !== undefined) updateData.name = body.name
    if (body.slug !== undefined) updateData.slug = body.slug
    if (body.description !== undefined) updateData.description = body.description
    if (body.color !== undefined) updateData.color = body.color
    if (body.icon !== undefined) updateData.icon = body.icon
    if (body.status !== undefined) updateData.status = body.status
    if (body.is_pinned !== undefined) updateData.is_pinned = body.is_pinned
    if (body.archived_at !== undefined) updateData.archived_at = body.archived_at

    const result = await repo.updateProject(id, updateData)

    if (isError(result)) {
      if (result.error.code === 'NOT_FOUND') {
        return mergeAuthResponse(projectNotFoundResponse(id), authResponse)
      }
      if (result.error.code === 'DUPLICATE_SLUG') {
        return mergeAuthResponse(databaseErrorResponse('Slug already exists in workspace', result.error.details), authResponse)
      }
      return mergeAuthResponse(databaseErrorResponse(result.error.message, result.error.details), authResponse)
    }

    return mergeAuthResponse(successResponse(result.data), authResponse)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return databaseErrorResponse('Failed to update project', message)
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, supabase, error, response: authResponse } = await getAuthUser(req)

    if (error || !user) {
      return mergeAuthResponse(authRequiredResponse(), authResponse)
    }

    const { id } = await params
    
    // Validate UUID format
    const uuidError = validateUUID('id', id)
    if (uuidError) {
      return uuidError
    }

    const repo = new ProjectRepository(supabase)
    const result = await repo.delete(id)

    if (isError(result)) {
      return mergeAuthResponse(databaseErrorResponse(result.error.message, result.error.details), authResponse)
    }

    return mergeAuthResponse(successResponse({ deleted: true }), authResponse)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return databaseErrorResponse('Failed to delete project', message)
  }
}
