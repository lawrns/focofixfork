import { supabase } from '@/lib/supabase-client'
import {
  TimeEntry,
  TimerSession,
  TimeTrackingSettings,
  TimeEntryModel,
  TimerSessionModel,
  TimeTrackingSettingsModel,
  TimeEntrySummary
} from '@/lib/models/time-tracking'

// TODO(DB_ALIGNMENT): Schema alignment fixes applied
// | ACTUAL DB SCHEMA: id, work_item_id, user_id, started_at, ended_at, duration_minutes, description, is_billable, created_at, updated_at
// | FIXED: Replaced project_id/milestone_id/task_id with work_item_id, date with started_at, hours with duration_minutes, billable with is_billable
// | REMOVED: Approval workflow methods (submitTimeEntry, approveTimeEntry) - require DB migration to add status, submitted_at, approved_at, approved_by, rejection_reason columns
// | REMAINING ISSUE: TypeScript models in /lib/models/time-tracking.ts still need to be updated to match actual DB schema

const untypedSupabase = supabase as any

export class TimeTrackingService {
  /**
   * Start a new timer session (disabled - timer_sessions table not in schema)
   */
  static async startTimer(data: {
    user_id: string
    project_id?: string
    milestone_id?: string
    task_id?: string
    description: string
    tags?: string[]
  }): Promise<TimerSession> {
    throw new Error('Timer functionality not supported - timer_sessions table not in schema')
  }

  /**
   * Pause the current timer session (disabled)
   */
  static async pauseTimer(userId: string): Promise<TimerSession | null> {
    throw new Error('Timer functionality not supported - timer_sessions table not in schema')
  }

  /**
   * Resume the current timer session (disabled)
   */
  static async resumeTimer(userId: string): Promise<TimerSession | null> {
    throw new Error('Timer functionality not supported - timer_sessions table not in schema')
  }

  /**
   * Stop the current timer session and create a time entry (disabled)
   */
  static async stopTimer(userId: string, description?: string): Promise<TimeEntry | null> {
    throw new Error('Timer functionality not supported - timer_sessions table not in schema')
  }

  /**
   * Stop all running timers for a user (disabled)
   */
  static async stopAllTimers(userId: string): Promise<void> {
    throw new Error('Timer functionality not supported - timer_sessions table not in schema')
  }

  /**
   * Get the active timer session for a user (disabled)
   */
  static async getActiveTimerSession(userId: string): Promise<TimerSession | null> {
    throw new Error('Timer functionality not supported - timer_sessions table not in schema')
  }

  /**
   * Create a manual time entry
   */
  static async createTimeEntry(data: {
    user_id: string
    work_item_id?: string
    description: string
    started_at: string
    ended_at?: string
    duration_minutes?: number
    is_billable?: boolean
  }): Promise<TimeEntry> {
    // Calculate duration if not provided and ended_at is available
    const duration = data.duration_minutes || (data.ended_at ?
      TimeEntryModel.calculateDuration(data.started_at, data.ended_at) : 0)

    const entryData = {
      user_id: data.user_id,
      work_item_id: data.work_item_id,
      description: data.description,
      started_at: data.started_at,
      ended_at: data.ended_at,
      duration_minutes: duration,
      is_billable: data.is_billable || false
    }

    const validation = TimeEntryModel.validateTimeEntry({
      ...data,
      duration_minutes: duration
    })
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`)
    }

    const { data: result, error } = await untypedSupabase
      .from('time_entries')
      .insert(entryData)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create time entry: ${error.message}`)
    }

    return TimeEntryModel.fromDatabase(result)
  }

  /**
   * Update a time entry
   */
  static async updateTimeEntry(
    entryId: string,
    userId: string,
    updates: any
  ): Promise<TimeEntry> {
    // Get current entry to validate permissions
    const { data: currentEntry, error: fetchError } = await untypedSupabase
      .from('time_entries')
      .select('*')
      .eq('id', entryId)
      .single()

    if (fetchError) {
      throw new Error(`Failed to fetch time entry: ${fetchError.message}`)
    }

    const entry = TimeEntryModel.fromDatabase(currentEntry)

    // Check permissions (implement proper role checking)
    if (!TimeEntryModel.canEdit(entry, userId, 'member')) {
      throw new Error('You do not have permission to edit this time entry')
    }

    const validation = TimeEntryModel.validateTimeEntry({ ...entry, ...updates })
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`)
    }

    // Recalculate duration if ended_at is updated
    const duration = updates.ended_at ?
      TimeEntryModel.calculateDuration(currentEntry.started_at, updates.ended_at) :
      updates.duration_minutes

    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (updates.work_item_id !== undefined) updateData.work_item_id = updates.work_item_id
    if (updates.description !== undefined) updateData.description = updates.description
    if (updates.started_at !== undefined) updateData.started_at = updates.started_at
    if (updates.ended_at !== undefined) updateData.ended_at = updates.ended_at
    if (duration !== undefined) updateData.duration_minutes = duration
    if (updates.is_billable !== undefined) updateData.is_billable = updates.is_billable

    const { data, error } = await untypedSupabase
      .from('time_entries')
      .update(updateData)
      .eq('id', entryId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update time entry: ${error.message}`)
    }

    return TimeEntryModel.fromDatabase(data)
  }

  /**
   * Delete a time entry
   */
  static async deleteTimeEntry(entryId: string, userId: string): Promise<void> {
    // Get current entry to validate permissions
    const { data: currentEntry, error: fetchError } = await untypedSupabase
      .from('time_entries')
      .select('*')
      .eq('id', entryId)
      .single()

    if (fetchError) {
      throw new Error(`Failed to fetch time entry: ${fetchError.message}`)
    }

    const entry = TimeEntryModel.fromDatabase(currentEntry)

    // Check permissions
    if (!TimeEntryModel.canEdit(entry, userId, 'member')) {
      throw new Error('You do not have permission to delete this time entry')
    }

    const { error } = await untypedSupabase
      .from('time_entries')
      .delete()
      .eq('id', entryId)

    if (error) {
      throw new Error(`Failed to delete time entry: ${error.message}`)
    }
  }

  /**
   * Submit time entry for approval (DISABLED - requires DB migration)
   * TODO(DB_MIGRATION): Approval workflow requires adding columns to time_entries table:
   * - status (enum: 'draft', 'submitted', 'approved', 'rejected')
   * - submitted_at (timestamp)
   * - approved_at (timestamp)
   * - approved_by (uuid, references users.id)
   * - rejection_reason (text)
   */
  static async submitTimeEntry(_entryId: string, _userId: string): Promise<TimeEntry> {
    throw new Error('Approval workflow not supported - requires DB migration to add status, submitted_at columns')
  }

  /**
   * Approve or reject a time entry (DISABLED - requires DB migration)
   * TODO(DB_MIGRATION): Approval workflow requires adding columns to time_entries table:
   * - status (enum: 'draft', 'submitted', 'approved', 'rejected')
   * - submitted_at (timestamp)
   * - approved_at (timestamp)
   * - approved_by (uuid, references users.id)
   * - rejection_reason (text)
   */
  static async approveTimeEntry(
    _entryId: string,
    _approverId: string,
    _approved: boolean,
    _rejectionReason?: string
  ): Promise<TimeEntry> {
    throw new Error('Approval workflow not supported - requires DB migration to add status, approved_at, approved_by, rejection_reason columns')
  }

  /**
   * Get time entries with filtering
   */
  static async getTimeEntries(filters: {
    user_id?: string
    work_item_id?: string
    start_date?: string
    end_date?: string
    is_billable?: boolean
    limit?: number
    offset?: number
  } = {}): Promise<{ entries: TimeEntry[]; total: number }> {
    let query = untypedSupabase
      .from('time_entries')
      .select('*', { count: 'exact' })
      .order('started_at', { ascending: false })

    // @ts-ignore - Avoiding deep type instantiation issues with Supabase query chaining
    if (filters.user_id) {
      // @ts-ignore
      query = query.eq('user_id', filters.user_id)
    }

    if (filters.work_item_id) {
      // @ts-ignore
      query = query.eq('work_item_id', filters.work_item_id)
    }

    if (filters.start_date) {
      // @ts-ignore
      query = query.gte('started_at', filters.start_date)
    }

    if (filters.end_date) {
      // @ts-ignore
      query = query.lte('started_at', filters.end_date)
    }

    if (filters.is_billable !== undefined) {
      // @ts-ignore
      query = query.eq('is_billable', filters.is_billable)
    }

    if (filters.limit) {
      // @ts-ignore
      query = query.limit(filters.limit)
    }

    if (filters.offset) {
      // @ts-ignore
      query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1)
    }

    // @ts-ignore
    const { data, error, count } = await query

    if (error) {
      throw new Error(`Failed to fetch time entries: ${error.message}`)
    }

    return {
      entries: data?.map((entry: any) => TimeEntryModel.fromDatabase(entry)) || [],
      total: count || 0
    }
  }

  /**
   * Get time tracking summary for a user
   */
  static async getTimeSummary(
    userId: string,
    startDate?: string,
    endDate?: string
  ): Promise<TimeEntrySummary> {
    const filters: any = { user_id: userId }
    if (startDate) filters.start_date = startDate
    if (endDate) filters.end_date = endDate

    const { entries } = await this.getTimeEntries(filters)

    const totalHours = entries.reduce((sum, entry) => sum + (entry.duration_minutes / 60), 0)
    const billableHours = entries
      .filter((entry: any) => entry.is_billable)
      .reduce((sum, entry) => sum + (entry.duration_minutes / 60), 0)

    // NOTE: billable_rate column doesn't exist in DB, so total_amount will always be 0
    // TODO(DB_MIGRATION): Add billable_rate column if billing functionality is needed
    const totalAmount = 0

    // Calculate average daily hours (simplified)
    const daysDiff = startDate && endDate ?
      Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) : 30
    const averageDailyHours = totalHours / Math.max(daysDiff, 1)

    // Find most productive day (simplified - just return a placeholder)
    const mostProductiveDay = 'Monday'

    // Top work items (using work_item_id instead of project_id)
    const workItemHours: { [key: string]: { name: string; hours: number } } = {}
    entries.forEach((entry: any) => {
      if (entry.work_item_id) {
        if (!workItemHours[entry.work_item_id]) {
          workItemHours[entry.work_item_id] = { name: `Work Item ${entry.work_item_id}`, hours: 0 }
        }
        workItemHours[entry.work_item_id].hours += entry.duration_minutes / 60
      }
    })

    const topProjects = Object.entries(workItemHours)
      .map(([workItemId, data]) => ({
        project_id: workItemId, // Using project_id key for backward compatibility with interface
        project_name: data.name,
        hours: data.hours
      }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 5)

    // Weekly trend (placeholder)
    const weeklyTrend = [
      { week: 'Week 1', hours: 35 },
      { week: 'Week 2', hours: 42 },
      { week: 'Week 3', hours: 38 },
      { week: 'Week 4', hours: 40 }
    ]

    return {
      total_hours: Math.round(totalHours * 100) / 100,
      billable_hours: Math.round(billableHours * 100) / 100,
      total_amount: Math.round(totalAmount * 100) / 100,
      entries_count: entries.length,
      average_daily_hours: Math.round(averageDailyHours * 100) / 100,
      most_productive_day: mostProductiveDay,
      top_projects: topProjects,
      weekly_trend: weeklyTrend
    }
  }

  /**
   * Get or create user time tracking settings (disabled)
   */
  static async getUserSettings(userId: string): Promise<TimeTrackingSettings> {
    // Return default settings since table doesn't exist
    const defaults = TimeTrackingSettingsModel.getDefaults()
    return {
      ...defaults,
      user_id: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  }

  /**
   * Update user time tracking settings (disabled)
   */
  static async updateUserSettings(
    userId: string,
    updates: Partial<TimeTrackingSettings>
  ): Promise<TimeTrackingSettings> {
    // Return updated defaults since table doesn't exist
    const current = await this.getUserSettings(userId)
    return { ...current, ...updates }
  }
}
