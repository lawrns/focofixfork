import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'

import { ReminderService } from '@/features/tasks/services/reminder-service'
import {
  authRequiredResponse,
  successResponse,
  missingFieldResponse,
  validationFailedResponse,
  databaseErrorResponse
} from '@/lib/api/response-helpers'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, error, response: authResponse } = await getAuthUser(request)

    if (error || !user) {
      return mergeAuthResponse(authRequiredResponse(), authResponse)
    }

    const { id } = params
    const taskId = id
    const body = await request.json()
    const { reminder_at, option = 'custom' } = body

    if (!reminder_at) {
      return missingFieldResponse('reminder_at')
    }

    const reminderDate = new Date(reminder_at)
    if (isNaN(reminderDate.getTime())) {
      return validationFailedResponse(
        'Invalid reminder_at date format',
        { reminder_at }
      )
    }

    if (reminderDate <= new Date()) {
      return validationFailedResponse(
        'Reminder date must be in the future',
        { reminder_at }
      )
    }

    const result = await ReminderService.setReminder(
      user.id,
      taskId,
      reminderDate,
      option
    )

    if (!result.success) {
      const errorRes = databaseErrorResponse(
        result.error || 'Failed to set reminder',
        { taskId, option }
      )
      return mergeAuthResponse(errorRes, authResponse)
    }

    return mergeAuthResponse(successResponse(result.data, undefined, 201), authResponse)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return databaseErrorResponse('Failed to set reminder', message)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, error, response: authResponse } = await getAuthUser(request)

    if (error || !user) {
      return mergeAuthResponse(authRequiredResponse(), authResponse)
    }

    const { id } = params
    const taskId = id

    const result = await ReminderService.removeReminder(user.id, taskId)

    if (!result.success) {
      const errorRes = databaseErrorResponse(
        result.error || 'Failed to remove reminder',
        { taskId }
      )
      return mergeAuthResponse(errorRes, authResponse)
    }

    return mergeAuthResponse(successResponse({ message: 'Reminder removed' }), authResponse)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return databaseErrorResponse('Failed to remove reminder', message)
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, error, response: authResponse } = await getAuthUser(request)

    if (error || !user) {
      return mergeAuthResponse(authRequiredResponse(), authResponse)
    }

    const { id } = params
    const taskId = id

    const result = await ReminderService.getTaskReminders(taskId)

    if (!result.success) {
      const errorRes = databaseErrorResponse(
        result.error || 'Failed to get reminders',
        { taskId }
      )
      return mergeAuthResponse(errorRes, authResponse)
    }

    return mergeAuthResponse(successResponse(result.data), authResponse)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return databaseErrorResponse('Failed to get reminders', message)
  }
}
