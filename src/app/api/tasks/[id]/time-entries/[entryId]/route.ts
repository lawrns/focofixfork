import { NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/api/auth-helper'

export const dynamic = 'force-dynamic';import { TimeEntryRepository } from '@/lib/repositories/time-entry-repository'
import type { UpdateTimeEntryData } from '@/lib/repositories/time-entry-repository'
import { isError } from '@/lib/repositories/base-repository'
import {
  authRequiredResponse,
  successResponse,
  databaseErrorResponse,
  notFoundResponse
} from '@/lib/api/response-helpers'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; entryId: string }> }
) {
  try {
    const { user, supabase, error } = await getAuthUser(request)

    if (error || !user) {
      return authRequiredResponse()
    }

    const { id, entryId } = await params
    const taskId = id
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
        return notFoundResponse('Time entry', entryId)
      }
      return databaseErrorResponse(result.error.message, result.error.details)
    }

    return successResponse(result.data)
  } catch (err: any) {
    console.error('Time entry PUT error:', err)
    return databaseErrorResponse('Failed to update time entry', err)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; entryId: string }> }
) {
  try {
    const { user, supabase, error } = await getAuthUser(request)

    if (error || !user) {
      return authRequiredResponse()
    }

    const { id, entryId } = await params
    const taskId = id

    const repo = new TimeEntryRepository(supabase)

    const result = await repo.deleteTimeEntry(entryId, taskId, user.id)

    if (isError(result)) {
      return databaseErrorResponse(result.error.message, result.error.details)
    }

    return successResponse(null)
  } catch (err: any) {
    console.error('Time entry DELETE error:', err)
    return databaseErrorResponse('Failed to delete time entry', err)
  }
}
