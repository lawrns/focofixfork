import { NextRequest } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'

import { TimeEntryRepository } from '@/lib/repositories/time-entry-repository'
import type { UpdateTimeEntryData } from '@/lib/repositories/time-entry-repository'
import { isError } from '@/lib/repositories/base-repository'
import {
  authRequiredResponse,
  successResponse,
  databaseErrorResponse,
  notFoundResponse
} from '@/lib/api/response-helpers'

export const dynamic = 'force-dynamic'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; entryId: string }> }
) {
  try {
    const { id: taskId, entryId } = await params
    const { user, supabase, error, response: authResponse } = await getAuthUser(request)

    if (error || !user) {
      return mergeAuthResponse(authRequiredResponse(), authResponse)
    }

    const body = await request.json()

    const { notes } = body

    if (notes === undefined) {
      return databaseErrorResponse('Missing required field: notes')
    }

    const repo = new TimeEntryRepository(supabase)

    const updateData: UpdateTimeEntryData = {
      notes,
    }

    const result = await repo.updateTimeEntry(entryId, taskId, user.id, updateData)

    if (isError(result)) {
      if (result.error.code === 'NOT_FOUND') {
        const errorRes = notFoundResponse('Time entry', entryId)
        return mergeAuthResponse(errorRes, authResponse)
      }
      const errorRes = databaseErrorResponse(result.error.message, result.error.details)
      return mergeAuthResponse(errorRes, authResponse)
    }

    return mergeAuthResponse(successResponse(result.data), authResponse)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return databaseErrorResponse('Failed to update time entry', message)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; entryId: string }> }
) {
  try {
    const { id: taskId, entryId } = await params
    const { user, supabase, error, response: authResponse } = await getAuthUser(request)

    if (error || !user) {
      return mergeAuthResponse(authRequiredResponse(), authResponse)
    }

    const repo = new TimeEntryRepository(supabase)

    const result = await repo.deleteTimeEntry(entryId, taskId, user.id)

    if (isError(result)) {
      const errorRes = databaseErrorResponse(result.error.message, result.error.details)
      return mergeAuthResponse(errorRes, authResponse)
    }

    return mergeAuthResponse(successResponse(null), authResponse)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return databaseErrorResponse('Failed to delete time entry', message)
  }
}
