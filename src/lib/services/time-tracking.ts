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
    project_id?: string
    milestone_id?: string
    task_id?: string
    description: string
    start_time: string
    end_time?: string
    duration_minutes?: number
    billable?: boolean
    billable_rate?: number
    tags?: string[]
  }): Promise<TimeEntry> {
    const entryData = {
      user_id: data.user_id,
      project_id: data.project_id,
      milestone_id: data.milestone_id,
      description: data.description,
      date: data.start_time.split('T')[0], // Extract date from start_time
      hours: (data.duration_minutes || (data.end_time ?
        TimeEntryModel.calculateDuration(data.start_time, data.end_time) : 0)) / 60 // Convert minutes to hours
    }

    const validation = TimeEntryModel.validateTimeEntry({
      ...data,
      duration_minutes: entryData.hours * 60,
      status: 'completed'
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
    updates: Partial<TimeEntry>
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

    const { data, error } = await untypedSupabase
      .from('time_entries')
      .update({
        ...updates,
        duration_minutes: updates.end_time ?
          TimeEntryModel.calculateDuration(entry.start_time, updates.end_time) :
          updates.duration_minutes,
        updated_at: new Date().toISOString()
      })
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
   * Submit time entry for approval
   */
  static async submitTimeEntry(entryId: string, userId: string): Promise<TimeEntry> {
    const { data: currentEntry, error: fetchError } = await untypedSupabase
      .from('time_entries')
      .select('*')
      .eq('id', entryId)
      .single()

    if (fetchError) {
      throw new Error(`Failed to fetch time entry: ${fetchError.message}`)
    }

    const entry = TimeEntryModel.fromDatabase(currentEntry)

    if (!TimeEntryModel.canSubmit(entry, userId)) {
      throw new Error('This time entry cannot be submitted')
    }

    const { data, error } = await untypedSupabase
      .from('time_entries')
      .update({
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', entryId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to submit time entry: ${error.message}`)
    }

    return TimeEntryModel.fromDatabase(data)
  }

  /**
   * Approve or reject a time entry
   */
  static async approveTimeEntry(
    entryId: string,
    approverId: string,
    approved: boolean,
    rejectionReason?: string
  ): Promise<TimeEntry> {
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
    if (!TimeEntryModel.canApprove(entry, approverId, 'lead')) {
      throw new Error('You do not have permission to approve this time entry')
    }

    const updates: any = {
      status: approved ? 'approved' : 'rejected',
      approved_at: new Date().toISOString(),
      approved_by: approverId,
      updated_at: new Date().toISOString()
    }

    if (!approved && rejectionReason) {
      updates.rejection_reason = rejectionReason
    }

    const { data, error } = await untypedSupabase
      .from('time_entries')
      .update(updates)
      .eq('id', entryId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to ${approved ? 'approve' : 'reject'} time entry: ${error.message}`)
    }

    return TimeEntryModel.fromDatabase(data)
  }

  /**
   * Get time entries with filtering
   */
  static async getTimeEntries(filters: {
    user_id?: string
    project_id?: string
    milestone_id?: string
    task_id?: string
    start_date?: string
    end_date?: string
    status?: string[]
    billable?: boolean
    limit?: number
    offset?: number
  } = {}): Promise<{ entries: TimeEntry[]; total: number }> {
    let query = untypedSupabase
      .from('time_entries')
      .select('*', { count: 'exact' })
      .order('date', { ascending: false })

    // @ts-ignore - Avoiding deep type instantiation issues with Supabase query chaining
    if (filters.user_id) {
      // @ts-ignore
      query = query.eq('user_id', filters.user_id)
    }

    if (filters.project_id) {
      // @ts-ignore
      query = query.eq('project_id', filters.project_id)
    }

    if (filters.milestone_id) {
      // @ts-ignore
      query = query.eq('milestone_id', filters.milestone_id)
    }

    if (filters.task_id) {
      // @ts-ignore
      query = query.eq('task_id', filters.task_id)
    }

    if (filters.start_date) {
      // @ts-ignore
      query = query.gte('date', filters.start_date)
    }

    if (filters.end_date) {
      // @ts-ignore
      query = query.lte('date', filters.end_date)
    }

    if (filters.status?.length) {
      // @ts-ignore
      query = query.in('status', filters.status)
    }

    if (filters.billable !== undefined) {
      // @ts-ignore
      query = query.eq('billable', filters.billable)
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
      entries: data?.map(entry => TimeEntryModel.fromDatabase(entry)) || [],
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
      .filter(entry => entry.billable)
      .reduce((sum, entry) => sum + (entry.duration_minutes / 60), 0)

    const totalAmount = entries
      .filter(entry => entry.billable && entry.billable_rate)
      .reduce((sum, entry) => sum + TimeEntryModel.calculateBillableAmount(
        entry.duration_minutes,
        entry.billable_rate!
      ), 0)

    // Calculate average daily hours (simplified)
    const daysDiff = startDate && endDate ?
      Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) : 30
    const averageDailyHours = totalHours / Math.max(daysDiff, 1)

    // Find most productive day (simplified - just return a placeholder)
    const mostProductiveDay = 'Monday'

    // Top projects (placeholder implementation)
    const projectHours: { [key: string]: { name: string; hours: number } } = {}
    entries.forEach(entry => {
      if (entry.project_id) {
        if (!projectHours[entry.project_id]) {
          projectHours[entry.project_id] = { name: `Project ${entry.project_id}`, hours: 0 }
        }
        projectHours[entry.project_id].hours += entry.duration_minutes / 60
      }
    })

    const topProjects = Object.entries(projectHours)
      .map(([projectId, data]) => ({
        project_id: projectId,
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
