import { NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/api/auth-helper'

import { FilterRepository } from '@/lib/repositories/filter-repository'
import type { UpdateFilterData } from '@/lib/repositories/filter-repository'
import { isError } from '@/lib/repositories/base-repository'
import {
  authRequiredResponse,
  successResponse,
  databaseErrorResponse,
  notFoundResponse,
  forbiddenResponse
} from '@/lib/api/response-helpers'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, supabase, error } = await getAuthUser(request)

    if (error || !user) {
      return authRequiredResponse()
    }

    const filterId = params.id
    const repo = new FilterRepository(supabase)

    // Check ownership
    const ownershipResult = await repo.checkOwnership(filterId, user.id)

    if (isError(ownershipResult)) {
      if (ownershipResult.error.code === 'NOT_FOUND') {
        return notFoundResponse('Filter', filterId)
      }
      return databaseErrorResponse(ownershipResult.error.message, ownershipResult.error.details)
    }

    if (!ownershipResult.data) {
      return forbiddenResponse('You do not have permission to update this filter')
    }

    const body = await request.json()
    const updateData: UpdateFilterData = {}

    if (body.name !== undefined) {
      updateData.name = body.name
    }

    if (body.filters !== undefined) {
      updateData.filters = body.filters
    }

    const result = await repo.updateFilter(filterId, updateData)

    if (isError(result)) {
      if (result.error.code === 'NOT_FOUND') {
        return notFoundResponse('Filter', filterId)
      }
      return databaseErrorResponse(result.error.message, result.error.details)
    }

    return successResponse(result.data)
  } catch (err: any) {
    console.error('Error updating saved filter:', err)
    return databaseErrorResponse('Failed to update saved filter', err)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, supabase, error } = await getAuthUser(request)

    if (error || !user) {
      return authRequiredResponse()
    }

    const filterId = params.id
    const repo = new FilterRepository(supabase)

    // Check ownership
    const ownershipResult = await repo.checkOwnership(filterId, user.id)

    if (isError(ownershipResult)) {
      if (ownershipResult.error.code === 'NOT_FOUND') {
        return notFoundResponse('Filter', filterId)
      }
      return databaseErrorResponse(ownershipResult.error.message, ownershipResult.error.details)
    }

    if (!ownershipResult.data) {
      return forbiddenResponse('You do not have permission to delete this filter')
    }

    const result = await repo.delete(filterId)

    if (isError(result)) {
      return databaseErrorResponse(result.error.message, result.error.details)
    }

    return successResponse({ id: filterId })
  } catch (err: any) {
    console.error('Error deleting saved filter:', err)
    return databaseErrorResponse('Failed to delete saved filter', err)
  }
}
