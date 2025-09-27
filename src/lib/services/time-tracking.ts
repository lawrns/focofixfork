import { supabase } from '@/lib/supabase'
import {
  TimeEntry,
  TimerSession,
  TimeTrackingSettings,
  TimeEntryModel,
  TimerSessionModel,
  TimeTrackingSettingsModel,
  TimeEntrySummary
} from '@/lib/models/time-tracking'

export class TimeTrackingService {
  /**
   * Start a new timer session
   */
  static async startTimer(data: {
    user_id: string
    project_id?: string
    milestone_id?: string
    task_id?: string
    description: string
    tags?: string[]
  }): Promise<TimerSession> {
    // Stop any existing running timers for this user
    await this.stopAllTimers(data.user_id)

    const session = TimerSessionModel.createSession(data)

    const { data: result, error } = await supabase
      .from('timer_sessions')
      .insert(session)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to start timer: ${error.message}`)
    }

    return TimerSessionModel.fromDatabase(result)
  }

  /**
   * Pause the current timer session
   */
  static async pauseTimer(userId: string): Promise<TimerSession | null> {
    const session = await this.getActiveTimerSession(userId)
    if (!session) return null

    const pausedSession = TimerSessionModel.pauseSession(session)

    const { data, error } = await supabase
      .from('timer_sessions')
      .update({
        last_pause_start: pausedSession.last_pause_start,
        updated_at: pausedSession.updated_at
      })
      .eq('id', session.id)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to pause timer: ${error.message}`)
    }

    return TimerSessionModel.fromDatabase(data)
  }

  /**
   * Resume the current timer session
   */
  static async resumeTimer(userId: string): Promise<TimerSession | null> {
    const session = await this.getActiveTimerSession(userId)
    if (!session) return null

    const resumedSession = TimerSessionModel.resumeSession(session)

    const { data, error } = await supabase
      .from('timer_sessions')
      .update({
        paused_duration: resumedSession.paused_duration,
        last_pause_start: resumedSession.last_pause_start,
        updated_at: resumedSession.updated_at
      })
      .eq('id', session.id)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to resume timer: ${error.message}`)
    }

    return TimerSessionModel.fromDatabase(data)
  }

  /**
   * Stop the current timer session and create a time entry
   */
  static async stopTimer(userId: string, description?: string): Promise<TimeEntry | null> {
    const session = await this.getActiveTimerSession(userId)
    if (!session) return null

    // Stop the session
    const timeEntryData = TimerSessionModel.stopSession({
      ...session,
      description: description || session.description
    })

    // Create time entry
    const { data: entry, error: entryError } = await supabase
      .from('time_entries')
      .insert(timeEntryData)
      .select()
      .single()

    if (entryError) {
      throw new Error(`Failed to create time entry: ${entryError.message}`)
    }

    // Delete the timer session
    const { error: deleteError } = await supabase
      .from('timer_sessions')
      .delete()
      .eq('id', session.id)

    if (deleteError) {
      console.error('Failed to delete timer session:', deleteError)
      // Don't throw here as the time entry was created successfully
    }

    return TimeEntryModel.fromDatabase(entry)
  }

  /**
   * Stop all running timers for a user
   */
  static async stopAllTimers(userId: string): Promise<void> {
    const { data: sessions, error } = await supabase
      .from('timer_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_running', true)

    if (error) {
      throw new Error(`Failed to get active timers: ${error.message}`)
    }

    for (const session of sessions || []) {
      const sessionObj = TimerSessionModel.fromDatabase(session)
      const timeEntryData = TimerSessionModel.stopSession(sessionObj)

      // Create time entry
      await supabase
        .from('time_entries')
        .insert(timeEntryData)

      // Delete the session
      await supabase
        .from('timer_sessions')
        .delete()
        .eq('id', session.id)
    }
  }

  /**
   * Get the active timer session for a user
   */
  static async getActiveTimerSession(userId: string): Promise<TimerSession | null> {
    const { data, error } = await supabase
      .from('timer_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_running', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // No rows found
      throw new Error(`Failed to get active timer: ${error.message}`)
    }

    return TimerSessionModel.fromDatabase(data)
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
      ...data,
      duration_minutes: data.duration_minutes || (data.end_time ?
        TimeEntryModel.calculateDuration(data.start_time, data.end_time) : 0),
      billable: data.billable || false,
      status: 'completed' as const,
      tags: data.tags || []
    }

    const validation = TimeEntryModel.validateTimeEntry(entryData)
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`)
    }

    const { data: result, error } = await supabase
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
    const { data: currentEntry, error: fetchError } = await supabase
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

    const { data, error } = await supabase
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
    const { data: currentEntry, error: fetchError } = await supabase
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

    const { error } = await supabase
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
    const { data: currentEntry, error: fetchError } = await supabase
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

    const { data, error } = await supabase
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
    const { data: currentEntry, error: fetchError } = await supabase
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

    const { data, error } = await supabase
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
    let query = supabase
      .from('time_entries')
      .select('*', { count: 'exact' })
      .order('start_time', { ascending: false })

    if (filters.user_id) {
      query = query.eq('user_id', filters.user_id)
    }

    if (filters.project_id) {
      query = query.eq('project_id', filters.project_id)
    }

    if (filters.milestone_id) {
      query = query.eq('milestone_id', filters.milestone_id)
    }

    if (filters.task_id) {
      query = query.eq('task_id', filters.task_id)
    }

    if (filters.start_date) {
      query = query.gte('start_time', filters.start_date)
    }

    if (filters.end_date) {
      query = query.lte('start_time', filters.end_date)
    }

    if (filters.status?.length) {
      query = query.in('status', filters.status)
    }

    if (filters.billable !== undefined) {
      query = query.eq('billable', filters.billable)
    }

    if (filters.limit) {
      query = query.limit(filters.limit)
    }

    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1)
    }

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
   * Get or create user time tracking settings
   */
  static async getUserSettings(userId: string): Promise<TimeTrackingSettings> {
    const { data, error } = await supabase
      .from('time_tracking_settings')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code === 'PGRST116') {
      // Settings don't exist, create defaults
      const defaults = TimeTrackingSettingsModel.getDefaults()
      const newSettings = {
        ...defaults,
        user_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data: created, error: createError } = await supabase
        .from('time_tracking_settings')
        .insert(newSettings)
        .select()
        .single()

      if (createError) {
        throw new Error(`Failed to create settings: ${createError.message}`)
      }

      return TimeTrackingSettingsModel.fromDatabase(created)
    }

    if (error) {
      throw new Error(`Failed to fetch settings: ${error.message}`)
    }

    return TimeTrackingSettingsModel.fromDatabase(data)
  }

  /**
   * Update user time tracking settings
   */
  static async updateUserSettings(
    userId: string,
    updates: Partial<TimeTrackingSettings>
  ): Promise<TimeTrackingSettings> {
    const validation = TimeTrackingSettingsModel.validateSettings(updates)
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`)
    }

    const { data, error } = await supabase
      .from('time_tracking_settings')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update settings: ${error.message}`)
    }

    return TimeTrackingSettingsModel.fromDatabase(data)
  }
}
