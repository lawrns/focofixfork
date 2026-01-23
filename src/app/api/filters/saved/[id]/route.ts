import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'

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
  { params }: { params: Promise<{ id: string }> }
) {
  let authResponse: NextResponse | undefined;
  try {
    const { user, supabase, error, response } = await getAuthUser(request)
    authResponse = response;

    if (error || !user) {
      return mergeAuthResponse(authRequiredResponse(), authResponse)
    }

    const filterId = (await params).id
    const repo = new FilterRepository(supabase)

    // Check ownership
    const ownershipResult = await repo.checkOwnership(filterId, user.id)

    if (isError(ownershipResult)) {
      if (ownershipResult.error.code === 'NOT_FOUND') {
        return mergeAuthResponse(notFoundResponse('Filter', filterId), authResponse)
      }
      return mergeAuthResponse(databaseErrorResponse(ownershipResult.error.message, ownershipResult.error.details), authResponse)
    }

    if (!ownershipResult.data) {
      return mergeAuthResponse(forbiddenResponse('You do not have permission to update this filter'), authResponse)
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
        return mergeAuthResponse(notFoundResponse('Filter', filterId), authResponse)
      }
      return mergeAuthResponse(databaseErrorResponse(result.error.message, result.error.details), authResponse)
    }

    return mergeAuthResponse(successResponse(result.data), authResponse)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return mergeAuthResponse(databaseErrorResponse('Failed to update saved filter', message), authResponse)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let authResponse: NextResponse | undefined;
  try {
    const { user, supabase, error, response } = await getAuthUser(request)
    authResponse = response;

    if (error || !user) {
      return mergeAuthResponse(authRequiredResponse(), authResponse)
    }

    const filterId = (await params).id
    const repo = new FilterRepository(supabase)

    // Check ownership
    const ownershipResult = await repo.checkOwnership(filterId, user.id)

    if (isError(ownershipResult)) {
      if (ownershipResult.error.code === 'NOT_FOUND') {
        return mergeAuthResponse(notFoundResponse('Filter', filterId), authResponse)
      }
      return mergeAuthResponse(databaseErrorResponse(ownershipResult.error.message, ownershipResult.error.details), authResponse)
    }

    if (!ownershipResult.data) {
      return mergeAuthResponse(forbiddenResponse('You do not have permission to delete this filter'), authResponse)
    }

    const result = await repo.delete(filterId)

    if (isError(result)) {
      return mergeAuthResponse(databaseErrorResponse(result.error.message, result.error.details), authResponse)
    }

    return mergeAuthResponse(successResponse({ id: filterId }), authResponse)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return mergeAuthResponse(databaseErrorResponse('Failed to delete saved filter', message), authResponse)
  }
}
