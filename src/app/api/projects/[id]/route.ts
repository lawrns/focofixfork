import { NextRequest, NextResponse } from 'next/server'
import { ProjectRepository } from '@/lib/repositories/project-repository'
import type { UpdateProjectData } from '@/lib/repositories/project-repository'
import { isError } from '@/lib/repositories/base-repository'
import { successResponse, databaseErrorResponse, projectNotFoundResponse, validateUUID } from '@/lib/api/response-helpers'
import { supabaseAdmin } from '@/lib/supabase-server'
import { accessFailureResponse, requireProjectAccess } from '@/server/auth/access'
import { requireAuth } from '@/server/auth/requireAuth'
import { hasFounderFullAccess } from '@/lib/auth/founder-access'
import { resolvePrimaryWorkspace } from '@/server/workspaces/primary'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const access = await requireProjectAccess({ projectId: id })
    if (!access.ok) return accessFailureResponse(access)

    const accessClient = supabaseAdmin
    const repo = new ProjectRepository(accessClient)

    // Try to find by ID first
    let result = await repo.findById(id)

    // If not found and ID doesn't look like UUID, try by slug
    if (isError(result) && result.error.code === 'NOT_FOUND') {
      const { searchParams } = new URL(req.url)
      const requestedWorkspaceId = searchParams.get('workspace_id')
      const auth = await requireAuth()
      const scope = await resolvePrimaryWorkspace({
        user: auth,
        requestedWorkspaceId,
        client: supabaseAdmin,
      })

      if (!scope.ok) {
        return databaseErrorResponse(scope.message, scope.details)
      }

      if (scope.workspaceId && requestedWorkspaceId) {
        result = await repo.findBySlug(scope.workspaceId, id)
      } else if (scope.workspaceIds.length > 0) {
        let slugQuery = accessClient
          .from('foco_projects')
          .select('*')
          .eq('slug', id)
          .order('updated_at', { ascending: false })
          .limit(1)

        if (!hasFounderFullAccess(auth)) {
          slugQuery = slugQuery.in('workspace_id', scope.workspaceIds)
        }

        const { data: projectBySlug, error: slugError } = await slugQuery.maybeSingle()
        if (slugError) {
          return databaseErrorResponse('Failed to fetch project', slugError)
        }
        if (projectBySlug) {
          result = { ok: true, data: projectBySlug as any }
        }
      }
    }

    if (isError(result)) {
      if (result.error.code === 'NOT_FOUND') {
        return projectNotFoundResponse(id)
      }
      return databaseErrorResponse(result.error.message, result.error.details)
    }

    return successResponse(result.data)
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
    const { id } = await params
    
    // Validate UUID format
    const uuidError = validateUUID('id', id)
    if (uuidError) {
      return uuidError
    }

    const access = await requireProjectAccess({ projectId: id })
    if (!access.ok) return accessFailureResponse(access)

    const body = await req.json()
    const accessClient = supabaseAdmin
    const repo = new ProjectRepository(accessClient)

    const existing = await repo.findById(id)
    if (isError(existing)) {
      if (existing.error.code === 'NOT_FOUND') {
        return projectNotFoundResponse(id)
      }
      return databaseErrorResponse(existing.error.message, existing.error.details)
    }

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
    if (body.delegation_settings !== undefined) updateData.delegation_settings = body.delegation_settings
    if (body.assigned_agent_pool !== undefined) updateData.assigned_agent_pool = body.assigned_agent_pool

    const result = await repo.updateProject(id, updateData)

    if (isError(result)) {
      if (result.error.code === 'NOT_FOUND') {
        return projectNotFoundResponse(id)
      }
      if (result.error.code === 'DUPLICATE_SLUG') {
        return databaseErrorResponse('Slug already exists in workspace', result.error.details)
      }
      return databaseErrorResponse(result.error.message, result.error.details)
    }

    return successResponse(result.data)
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
    const { id } = await params
    
    // Validate UUID format
    const uuidError = validateUUID('id', id)
    if (uuidError) {
      return uuidError
    }

    const access = await requireProjectAccess({ projectId: id })
    if (!access.ok) return accessFailureResponse(access)

    const accessClient = supabaseAdmin
    const repo = new ProjectRepository(accessClient)

    const existing = await repo.findById(id)
    if (isError(existing)) {
      if (existing.error.code === 'NOT_FOUND') {
        return projectNotFoundResponse(id)
      }
      return databaseErrorResponse(existing.error.message, existing.error.details)
    }

    const result = await repo.delete(id)

    if (isError(result)) {
      return databaseErrorResponse(result.error.message, result.error.details)
    }

    return successResponse({ deleted: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return databaseErrorResponse('Failed to delete project', message)
  }
}
