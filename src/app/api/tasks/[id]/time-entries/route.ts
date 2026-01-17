import { NextRequest } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'

import { TimeEntryRepository } from '@/lib/repositories/time-entry-repository'
import type { CreateTimeEntryData } from '@/lib/repositories/time-entry-repository'
import { isError } from '@/lib/repositories/base-repository'
import {
  authRequiredResponse,
  successResponse,
  databaseErrorResponse,
  missingFieldResponse,
  validationFailedResponse
} from '@/lib/api/response-helpers'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, supabase, error, response: authResponse } = await getAuthUser(request)

    if (error || !user) {
      return mergeAuthResponse(authRequiredResponse(), authResponse)
    }

    const { id: taskId } = params
    const repo = new TimeEntryRepository(supabase)

    const result = await repo.findByTaskAndUser(taskId, user.id)

    if (isError(result)) {
      const errorRes = databaseErrorResponse(result.error.message, result.error.details)
      return mergeAuthResponse(errorRes, authResponse)
    }

    return mergeAuthResponse(successResponse({
      data: result.data.entries,
      totalSeconds: result.data.totalSeconds,
    }), authResponse)
  } catch (err: any) {
    console.error('Time entries GET error:', err)
    return databaseErrorResponse('Failed to fetch time entries', err)
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, supabase, error, response: authResponse } = await getAuthUser(request)

    if (error || !user) {
      return mergeAuthResponse(authRequiredResponse(), authResponse)
    }

    const { id: taskId } = params
    const body = await request.json()

    const { startTime, endTime, durationSeconds, notes } = body

    // Validate required fields
    if (!startTime) {
      return missingFieldResponse('startTime')
    }

    if (!endTime) {
      return missingFieldResponse('endTime')
    }

    if (!durationSeconds) {
      return missingFieldResponse('durationSeconds')
    }

    const repo = new TimeEntryRepository(supabase)

    const timeEntryData: CreateTimeEntryData = {
      task_id: taskId,
      user_id: user.id,
      start_time: startTime,
      end_time: endTime,
      duration_seconds: durationSeconds,
      notes: notes || '',
    }

    const result = await repo.createTimeEntry(timeEntryData)

    if (isError(result)) {
      if (result.error.code === 'VALIDATION_FAILED') {
        const errorRes = validationFailedResponse(result.error.message, result.error.details)
        return mergeAuthResponse(errorRes, authResponse)
      }
      const errorRes = databaseErrorResponse(result.error.message, result.error.details)
      return mergeAuthResponse(errorRes, authResponse)
    }

    return mergeAuthResponse(successResponse(result.data, undefined, 201), authResponse)
  } catch (err: any) {
    console.error('Time entries POST error:', err)
    return databaseErrorResponse('Failed to create time entry', err)
  }
}
