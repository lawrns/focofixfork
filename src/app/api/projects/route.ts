import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/api/auth-helper'
import { ProjectRepository } from '@/lib/repositories/project-repository'
import type { CreateProjectData } from '@/lib/repositories/project-repository'
import { isError } from '@/lib/repositories/base-repository'
import { authRequiredResponse, successResponse, databaseErrorResponse, createPaginationMeta, missingFieldResponse, duplicateSlugResponse, isValidUUID, workspaceNotFoundResponse } from '@/lib/api/response-helpers'

export async function GET(req: NextRequest) {
  try {
    const { user, supabase, error } = await getAuthUser(req)

    if (error || !user) {
      return authRequiredResponse()
    }

    const { searchParams } = new URL(req.url)
    const workspaceId = searchParams.get('workspace_id')
    const id = searchParams.get('id')
    const status = searchParams.get('status')
    const archived = searchParams.get('archived')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    const repo = new ProjectRepository(supabase)

    // If id provided, fetch single project
    if (id) {
      if (!isValidUUID(id)) {
        return missingFieldResponse('Invalid project ID format')
      }
      
      const result = await repo.findById(id)
      
      if (isError(result)) {
        return databaseErrorResponse(result.error.message, result.error.details)
      }
      
      if (!result.data) {
        return NextResponse.json(
          { success: false, error: 'Project not found' },
          { status: 404 }
        )
      }
      
      return successResponse(result.data)
    }

    // If workspace_id provided, use workspace-scoped query
    if (workspaceId) {
      const result = await repo.findByWorkspace(workspaceId, {
        status: status as any,
        archived: archived === 'true' ? true : archived === 'false' ? false : undefined,
        limit,
        offset,
      })

      if (isError(result)) {
        return databaseErrorResponse(result.error.message, result.error.details)
      }

      const meta = createPaginationMeta(result.meta?.count ?? 0, limit, offset)
      return successResponse(result.data, meta)
    }

    // Otherwise, use generic findMany with filters
    const filters: Record<string, any> = {}
    if (status) filters.status = status

    const result = await repo.findMany(filters, { limit, offset })

    if (isError(result)) {
      return databaseErrorResponse(result.error.message, result.error.details)
    }

    const meta = createPaginationMeta(result.meta?.count ?? 0, limit, offset)
    return successResponse(result.data, meta)
  } catch (err: any) {
    console.error('Projects API error:', err)
    return databaseErrorResponse('Failed to fetch projects', err)
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, supabase, error } = await getAuthUser(req)

    if (error || !user) {
      return authRequiredResponse()
    }

    const body = await req.json()

    // Validate required fields
    if (!body.name) {
      return missingFieldResponse('name')
    }

    if (!body.workspace_id) {
      return missingFieldResponse('workspace_id')
    }

    // Validate workspace_id format
    if (!isValidUUID(body.workspace_id)) {
      return workspaceNotFoundResponse(body.workspace_id)
    }

    // Generate slug from name if not provided
    const slug = body.slug || body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

    const repo = new ProjectRepository(supabase)

    const projectData: CreateProjectData = {
      workspace_id: body.workspace_id,
      name: body.name,
      slug,
      description: body.description || null,
      brief: body.brief || null,
      color: body.color,
      icon: body.icon,
      status: body.status,
      owner_id: user.id,
    }

    const result = await repo.createProject(projectData)

    if (isError(result)) {
      // Handle specific error codes
      if (result.error.code === 'DUPLICATE_SLUG') {
        return duplicateSlugResponse(slug)
      }
      return databaseErrorResponse(result.error.message, result.error.details)
    }

    return successResponse(result.data, undefined, 201)
  } catch (err: any) {
    console.error('Projects POST error:', err)
    return databaseErrorResponse('Failed to create project', err)
  }
}
