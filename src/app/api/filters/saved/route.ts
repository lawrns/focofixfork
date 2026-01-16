import { NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/api/auth-helper'

import { FilterRepository } from '@/lib/repositories/filter-repository'
import type { CreateFilterData } from '@/lib/repositories/filter-repository'
import { isError } from '@/lib/repositories/base-repository'
import {
  authRequiredResponse,
  successResponse,
  databaseErrorResponse,
  missingFieldResponse,
  createPaginationMeta
} from '@/lib/api/response-helpers'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { user, supabase, error } = await getAuthUser(request)

    if (error || !user) {
      return authRequiredResponse()
    }

    const searchParams = request.nextUrl.searchParams
    const workspaceId = searchParams.get('workspace_id')

    if (!workspaceId) {
      return missingFieldResponse('workspace_id')
    }

    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    const repo = new FilterRepository(supabase)
    const result = await repo.findByWorkspaceAndUser(workspaceId, user.id, {
      limit,
      offset,
    })

    if (isError(result)) {
      return databaseErrorResponse(result.error.message, result.error.details)
    }

    const meta = createPaginationMeta(result.meta?.count ?? 0, limit, offset)
    return successResponse(result.data, meta)
  } catch (err: any) {
    console.error('Error fetching saved filters:', err)
    return databaseErrorResponse('Failed to fetch saved filters', err)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, supabase, error } = await getAuthUser(request)

    if (error || !user) {
      return authRequiredResponse()
    }

    const body = await request.json()

    if (!body.name) {
      return missingFieldResponse('name')
    }

    if (!body.workspace_id) {
      return missingFieldResponse('workspace_id')
    }

    const repo = new FilterRepository(supabase)

    const filterData: CreateFilterData = {
      workspace_id: body.workspace_id,
      name: body.name,
      filters: body.filters || {},
      created_by: user.id,
    }

    const result = await repo.createFilter(filterData)

    if (isError(result)) {
      return databaseErrorResponse(result.error.message, result.error.details)
    }

    return successResponse(result.data, undefined, 201)
  } catch (err: any) {
    console.error('Error creating saved filter:', err)
    return databaseErrorResponse('Failed to create saved filter', err)
  }
}
