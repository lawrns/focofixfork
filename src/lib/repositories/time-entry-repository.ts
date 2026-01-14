/**
 * Time Entry Repository
 * Type-safe database access for task_time_entries table
 */

import { BaseRepository, Result, Ok, Err } from './base-repository'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface TimeEntry {
  id: string
  task_id: string
  user_id: string
  start_time: string
  end_time: string
  duration_seconds: number
  notes: string
  created_at: string
  updated_at: string
}

export interface CreateTimeEntryData {
  task_id: string
  user_id: string
  start_time: string
  end_time: string
  duration_seconds: number
  notes?: string
}

export interface UpdateTimeEntryData {
  notes?: string
}

export interface TimeEntriesWithTotal {
  entries: TimeEntry[]
  totalSeconds: number
}

export class TimeEntryRepository extends BaseRepository<TimeEntry> {
  protected table = 'task_time_entries'

  constructor(supabase: SupabaseClient) {
    super(supabase)
  }

  /**
   * Find all time entries for a task by a specific user
   */
  async findByTaskAndUser(
    taskId: string,
    userId: string,
    options?: {
      limit?: number
      offset?: number
    }
  ): Promise<Result<TimeEntriesWithTotal>> {
    let query = this.supabase
      .from(this.table)
      .select('*')
      .eq('task_id', taskId)
      .eq('user_id', userId)
      .order('start_time', { ascending: false })

    // Apply pagination
    if (options?.limit !== undefined) {
      const offset = options.offset ?? 0
      query = query.range(offset, offset + options.limit - 1)
    }

    const { data, error } = await query

    if (error) {
      return Err({
        code: 'DATABASE_ERROR',
        message: 'Failed to fetch time entries',
        details: error,
      })
    }

    const entries = data as TimeEntry[]
    const totalSeconds = entries.reduce((sum, entry) => sum + entry.duration_seconds, 0)

    return Ok({
      entries,
      totalSeconds,
    })
  }

  /**
   * Create a new time entry with validation
   */
  async createTimeEntry(data: CreateTimeEntryData): Promise<Result<TimeEntry>> {
    // Validate duration
    if (data.duration_seconds <= 0) {
      return Err({
        code: 'VALIDATION_FAILED',
        message: 'Duration must be greater than 0',
        details: { duration_seconds: data.duration_seconds },
      })
    }

    // Validate time range
    const start = new Date(data.start_time)
    const end = new Date(data.end_time)

    if (end <= start) {
      return Err({
        code: 'VALIDATION_FAILED',
        message: 'End time must be after start time',
        details: { start_time: data.start_time, end_time: data.end_time },
      })
    }

    // Create time entry
    const timeEntryData = {
      ...data,
      notes: data.notes || '',
    }

    return this.create(timeEntryData)
  }

  /**
   * Update time entry (only notes can be updated)
   */
  async updateTimeEntry(
    entryId: string,
    taskId: string,
    userId: string,
    data: UpdateTimeEntryData
  ): Promise<Result<TimeEntry>> {
    const { data: updated, error } = await this.supabase
      .from(this.table)
      .update(data)
      .eq('id', entryId)
      .eq('task_id', taskId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      // Check if record not found
      if (error.code === 'PGRST116') {
        return Err({
          code: 'NOT_FOUND',
          message: 'Time entry not found',
          details: { entryId, taskId, userId },
        })
      }

      return Err({
        code: 'DATABASE_ERROR',
        message: 'Failed to update time entry',
        details: error,
      })
    }

    return Ok(updated as TimeEntry)
  }

  /**
   * Delete a time entry
   */
  async deleteTimeEntry(
    entryId: string,
    taskId: string,
    userId: string
  ): Promise<Result<void>> {
    const { error } = await this.supabase
      .from(this.table)
      .delete()
      .eq('id', entryId)
      .eq('task_id', taskId)
      .eq('user_id', userId)

    if (error) {
      return Err({
        code: 'DATABASE_ERROR',
        message: 'Failed to delete time entry',
        details: error,
      })
    }

    return Ok(undefined)
  }

  /**
   * Get total time spent on a task by a specific user
   */
  async getTotalTimeForTask(taskId: string, userId: string): Promise<Result<number>> {
    const { data, error } = await this.supabase
      .from(this.table)
      .select('duration_seconds')
      .eq('task_id', taskId)
      .eq('user_id', userId)

    if (error) {
      return Err({
        code: 'DATABASE_ERROR',
        message: 'Failed to calculate total time',
        details: error,
      })
    }

    const total = (data || []).reduce((sum, entry) => sum + entry.duration_seconds, 0)
    return Ok(total)
  }
}
