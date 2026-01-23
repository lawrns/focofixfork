import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { supabase } from '@/lib/supabase-client'
import { authRequiredResponse, successResponse, validationFailedResponse, databaseErrorResponse, isValidUUID } from '@/lib/api/response-helpers'

export const dynamic = 'force-dynamic'

interface CreateTimeEntryRequest {
  task_id: string
  start_time: string // ISO datetime
  end_time: string // ISO datetime
  notes?: string
}

// POST /api/time-entries - Create a new time entry
export async function POST(req: NextRequest) {
  try {
    const { user, error, response: authResponse } = await getAuthUser(req)

    if (error || !user) {
      return mergeAuthResponse(authRequiredResponse(), authResponse)
    }

    const body: CreateTimeEntryRequest = await req.json()

    // Validate required fields
    if (!body.task_id) {
      return validationFailedResponse('task_id is required')
    }

    // Validate UUID format
    if (!isValidUUID(body.task_id)) {
      return validationFailedResponse('task_id must be a valid UUID')
    }

    if (!body.start_time) {
      return validationFailedResponse('start_time is required')
    }

    if (!body.end_time) {
      return validationFailedResponse('end_time is required')
    }

    // Validate datetime format and calculate duration
    const startTime = new Date(body.start_time)
    const endTime = new Date(body.end_time)

    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      return validationFailedResponse('start_time and end_time must be valid ISO datetime strings')
    }

    if (endTime <= startTime) {
      return validationFailedResponse('end_time must be after start_time')
    }

    const durationSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000)

    // Validate max duration (24 hours)
    const MAX_DURATION_SECONDS = 24 * 60 * 60
    if (durationSeconds > MAX_DURATION_SECONDS) {
      return validationFailedResponse('Duration cannot exceed 24 hours')
    }

    // Validate notes length (5000 chars)
    if (body.notes && body.notes.length > 5000) {
      return validationFailedResponse('Notes cannot exceed 5000 characters')
    }

    // Verify user has access to the task
    const { data: task, error: taskError } = await supabase
      .from('work_items')
      .select('id, workspace_id')
      .eq('id', body.task_id)
      .maybeSingle()

    if (taskError || !task) {
      return mergeAuthResponse(NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      ), authResponse)
    }

    // Verify user is a member of the workspace
    const { data: workspaceMember, error: memberError } = await supabase
      .from('workspace_members')
      .select('user_id')
      .eq('workspace_id', task.workspace_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (memberError || !workspaceMember) {
      return mergeAuthResponse(NextResponse.json(
        { success: false, error: 'You do not have access to this task' },
        { status: 403 }
      ), authResponse)
    }

    // Create the time entry
    const { data: timeEntry, error: insertError } = await supabase
      .from('task_time_entries')
      .insert({
        task_id: body.task_id,
        user_id: user.id,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        duration_seconds: durationSeconds,
        notes: body.notes || null,
      })
      .select()
      .single()

    if (insertError) {
      return databaseErrorResponse('Failed to create time entry', insertError)
    }

    return mergeAuthResponse(successResponse(timeEntry, undefined, 201), authResponse)
  } catch (err: any) {
    console.error('Create time entry error:', err)
    return databaseErrorResponse('Failed to create time entry', err)
  }
}

// GET /api/time-entries - Get time entries for a task or user
export async function GET(req: NextRequest) {
  try {
    const { user, error, response: authResponse } = await getAuthUser(req)

    if (error || !user) {
      return mergeAuthResponse(authRequiredResponse(), authResponse)
    }

    const { searchParams } = new URL(req.url)
    const taskId = searchParams.get('task_id')
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 1000)
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabase
      .from('task_time_entries')
      .select('*')
      .eq('user_id', user.id)

    if (taskId) {
      query = query.eq('task_id', taskId)
    }

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data, error: dbError } = await query

    if (dbError) {
      return databaseErrorResponse('Failed to fetch time entries', dbError)
    }

    return mergeAuthResponse(successResponse(data || []), authResponse)
  } catch (err: any) {
    console.error('Fetch time entries error:', err)
    return databaseErrorResponse('Failed to fetch time entries', err)
  }
}
