import { NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/api/auth-helper'
import { ReminderService } from '@/features/tasks/services/reminder-service'
import {
  authRequiredResponse,
  successResponse,
  missingFieldResponse,
  validationFailedResponse,
  databaseErrorResponse
} from '@/lib/api/response-helpers'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await getAuthUser(request)

    if (error || !user) {
      return authRequiredResponse()
    }

    const { id } = await params
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
      return databaseErrorResponse(
        result.error || 'Failed to set reminder',
        { taskId, option }
      )
    }

    return successResponse(result.data, undefined, 201)
  } catch (err: any) {
    console.error('Reminder API error:', err)
    return databaseErrorResponse('Failed to set reminder', err)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await getAuthUser(request)

    if (error || !user) {
      return authRequiredResponse()
    }

    const { id } = await params
    const taskId = id

    const result = await ReminderService.removeReminder(user.id, taskId)

    if (!result.success) {
      return databaseErrorResponse(
        result.error || 'Failed to remove reminder',
        { taskId }
      )
    }

    return successResponse({ message: 'Reminder removed' })
  } catch (err: any) {
    console.error('Remove reminder API error:', err)
    return databaseErrorResponse('Failed to remove reminder', err)
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await getAuthUser(request)

    if (error || !user) {
      return authRequiredResponse()
    }

    const { id } = await params
    const taskId = id

    const result = await ReminderService.getTaskReminders(taskId)

    if (!result.success) {
      return databaseErrorResponse(
        result.error || 'Failed to get reminders',
        { taskId }
      )
    }

    return successResponse(result.data)
  } catch (err: any) {
    console.error('Get reminders API error:', err)
    return databaseErrorResponse('Failed to get reminders', err)
  }
}
