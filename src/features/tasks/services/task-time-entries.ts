import { supabase } from '@/lib/supabase-client'
import type { Database } from '@/lib/supabase/types'

type TimeEntry = Database['public']['Tables']['task_time_entries']['Row']
type TimeEntryInsert = Database['public']['Tables']['task_time_entries']['Insert']

export interface TimeEntryResponse<T = TimeEntry> {
  success: boolean
  data?: T
  error?: string
}

export interface TimeEntriesListResponse {
  success: boolean
  data?: TimeEntry[]
  totalSeconds?: number
  error?: string
}

export class TaskTimeEntriesService {
  static async getTimeEntries(
    taskId: string,
    userId: string
  ): Promise<TimeEntriesListResponse> {
    try {
      if (!taskId || !userId) {
        return { success: false, error: 'Task ID and User ID are required' }
      }

      const { data, error } = await supabase
        .from('task_time_entries')
        .select('*')
        .eq('task_id', taskId)
        .eq('user_id', userId)
        .order('start_time', { ascending: false })

      if (error) {
        return { success: false, error: error.message }
      }

      const totalSeconds = this.calculateTotalSeconds(data || [])
      return { success: true, data: data || [], totalSeconds }
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch time entries' }
    }
  }

  static async createTimeEntry(
    taskId: string,
    userId: string,
    entry: {
      startTime: Date
      endTime: Date
      durationSeconds: number
      notes?: string
    }
  ): Promise<TimeEntryResponse> {
    try {
      if (!taskId || !userId) {
        return { success: false, error: 'Task ID and User ID are required' }
      }

      if (!entry.startTime || !entry.endTime || entry.durationSeconds <= 0) {
        return { success: false, error: 'Invalid time entry data' }
      }

      if (entry.endTime <= entry.startTime) {
        return { success: false, error: 'End time must be after start time' }
      }

      const dataToInsert: TimeEntryInsert = {
        task_id: taskId,
        user_id: userId,
        start_time: entry.startTime.toISOString(),
        end_time: entry.endTime.toISOString(),
        duration_seconds: entry.durationSeconds,
        notes: entry.notes || ''
      }

      const { data, error } = await supabase
        .from('task_time_entries')
        .insert(dataToInsert)
        .select()
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, data }
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to create time entry' }
    }
  }

  static async updateTimeEntry(
    taskId: string,
    entryId: string,
    userId: string,
    updates: { notes?: string }
  ): Promise<TimeEntryResponse> {
    try {
      const { data, error } = await supabase
        .from('task_time_entries')
        .update(updates)
        .eq('id', entryId)
        .eq('task_id', taskId)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) {
        return error.code === 'PGRST116'
          ? { success: false, error: 'Time entry not found' }
          : { success: false, error: error.message }
      }

      return { success: true, data }
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to update time entry' }
    }
  }

  static async deleteTimeEntry(
    taskId: string,
    entryId: string,
    userId: string
  ): Promise<TimeEntryResponse<null>> {
    try {
      const { error } = await supabase
        .from('task_time_entries')
        .delete()
        .eq('id', entryId)
        .eq('task_id', taskId)
        .eq('user_id', userId)

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, data: null }
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to delete time entry' }
    }
  }

  static calculateTotalSeconds(entries: TimeEntry[]): number {
    if (!Array.isArray(entries)) return 0
    return entries.reduce((sum, entry) => sum + (entry.duration_seconds || 0), 0)
  }

  static formatDuration(seconds: number): string {
    if (!Number.isFinite(seconds) || seconds < 0) seconds = 0
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return [hours, minutes, secs]
      .map(n => String(n).padStart(2, '0'))
      .join(':')
  }

  static formatDurationHuman(seconds: number): string {
    if (!Number.isFinite(seconds) || seconds < 0) seconds = 0
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    const parts = []
    if (hours > 0) parts.push(`${hours}h`)
    if (minutes > 0) parts.push(`${minutes}m`)
    if (secs > 0 && hours === 0) parts.push(`${secs}s`)
    return parts.length > 0 ? parts.join(' ') : `${secs}second${secs !== 1 ? 's' : ''}`
  }
}
