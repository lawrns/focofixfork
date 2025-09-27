/**
 * Time Tracking Entity Models
 * Defines the structure and operations for time tracking functionality
 */

export type TimeEntryStatus = 'active' | 'paused' | 'completed' | 'submitted' | 'approved' | 'rejected'

export interface TimeEntry {
  id: string
  user_id: string
  project_id?: string
  milestone_id?: string
  task_id?: string
  description: string
  start_time: string
  end_time?: string
  duration_minutes: number // Calculated from start/end or manual entry
  billable: boolean
  billable_rate?: number
  status: TimeEntryStatus
  tags: string[]
  created_at: string
  updated_at: string
  submitted_at?: string
  approved_at?: string
  approved_by?: string
  rejection_reason?: string
}

export interface TimeEntrySummary {
  total_hours: number
  billable_hours: number
  total_amount: number
  entries_count: number
  average_daily_hours: number
  most_productive_day: string
  top_projects: Array<{
    project_id: string
    project_name: string
    hours: number
  }>
  weekly_trend: Array<{
    week: string
    hours: number
  }>
}

export interface TimerSession {
  id: string
  user_id: string
  project_id?: string
  milestone_id?: string
  task_id?: string
  description: string
  start_time: string
  end_time?: string
  is_running: boolean
  paused_duration: number // Total paused time in minutes
  last_pause_start?: string
  tags: string[]
  created_at: string
  updated_at: string
}

export interface TimeTrackingSettings {
  user_id: string
  default_billable: boolean
  default_billable_rate: number
  require_description: boolean
  auto_stop_on_idle: boolean
  idle_timeout_minutes: number
  weekly_hour_target: number
  work_days: number[] // 0-6, Sunday = 0
  work_start_hour: number // 0-23
  work_end_hour: number // 0-23
  break_duration_minutes: number
  reminder_interval_minutes: number
  created_at: string
  updated_at: string
}

export class TimeEntryModel {
  /**
   * Validate time entry creation/update
   */
  static validateTimeEntry(data: Partial<TimeEntry>): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!data.description?.trim()) {
      errors.push('Description is required')
    }

    if (!data.start_time) {
      errors.push('Start time is required')
    }

    if (data.end_time && data.start_time && new Date(data.end_time) <= new Date(data.start_time)) {
      errors.push('End time must be after start time')
    }

    if (data.duration_minutes != null && data.duration_minutes < 0) {
      errors.push('Duration cannot be negative')
    }

    if (data.billable_rate != null && data.billable_rate < 0) {
      errors.push('Billable rate cannot be negative')
    }

    // Validate that at least one of project_id, milestone_id, or task_id is provided
    if (!data.project_id && !data.milestone_id && !data.task_id) {
      errors.push('Time entry must be associated with a project, milestone, or task')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Calculate duration from start and end times
   */
  static calculateDuration(startTime: string, endTime?: string): number {
    if (!endTime) return 0

    const start = new Date(startTime)
    const end = new Date(endTime)
    const diffMs = end.getTime() - start.getTime()

    return Math.round(diffMs / (1000 * 60)) // Convert to minutes
  }

  /**
   * Format duration for display
   */
  static formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${minutes}m`
    }

    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60

    if (remainingMinutes === 0) {
      return `${hours}h`
    }

    return `${hours}h ${remainingMinutes}m`
  }

  /**
   * Format duration in decimal hours (for billing)
   */
  static formatDurationDecimal(minutes: number): number {
    return Math.round((minutes / 60) * 100) / 100
  }

  /**
   * Calculate billable amount
   */
  static calculateBillableAmount(durationMinutes: number, ratePerHour: number): number {
    const hours = durationMinutes / 60
    return Math.round((hours * ratePerHour) * 100) / 100
  }

  /**
   * Check if time entry can be edited
   */
  static canEdit(entry: TimeEntry, userId: string, userRole: string): boolean {
    // Users can edit their own entries if not submitted/approved
    if (entry.user_id === userId && !['submitted', 'approved'].includes(entry.status)) {
      return true
    }

    // Admins can edit any entry
    return ['director', 'lead'].includes(userRole)
  }

  /**
   * Check if time entry can be submitted for approval
   */
  static canSubmit(entry: TimeEntry, userId: string): boolean {
    return entry.user_id === userId &&
           entry.status === 'completed' &&
           !!entry.end_time
  }

  /**
   * Check if time entry can be approved/rejected
   */
  static canApprove(entry: TimeEntry, userId: string, userRole: string): boolean {
    return entry.status === 'submitted' &&
           entry.user_id !== userId && // Can't approve own entries
           ['director', 'lead'].includes(userRole)
  }

  /**
   * Transform raw database response to TimeEntry
   */
  static fromDatabase(data: any): TimeEntry {
    return {
      id: data.id,
      user_id: data.user_id,
      project_id: data.project_id,
      milestone_id: data.milestone_id,
      task_id: data.task_id,
      description: data.description,
      start_time: data.start_time,
      end_time: data.end_time,
      duration_minutes: data.duration_minutes,
      billable: data.billable,
      billable_rate: data.billable_rate,
      status: data.status,
      tags: data.tags || [],
      created_at: data.created_at,
      updated_at: data.updated_at,
      submitted_at: data.submitted_at,
      approved_at: data.approved_at,
      approved_by: data.approved_by,
      rejection_reason: data.rejection_reason
    }
  }
}

export class TimerSessionModel {
  /**
   * Start a new timer session
   */
  static createSession(data: {
    user_id: string
    project_id?: string
    milestone_id?: string
    task_id?: string
    description: string
    tags?: string[]
  }): Omit<TimerSession, 'id' | 'created_at' | 'updated_at'> {
    return {
      user_id: data.user_id,
      project_id: data.project_id,
      milestone_id: data.milestone_id,
      task_id: data.task_id,
      description: data.description,
      start_time: new Date().toISOString(),
      is_running: true,
      paused_duration: 0,
      tags: data.tags || []
    }
  }

  /**
   * Calculate current session duration (including pauses)
   */
  static getCurrentDuration(session: TimerSession): number {
    const startTime = new Date(session.start_time)
    const now = new Date()

    let totalDuration = now.getTime() - startTime.getTime()
    totalDuration -= (session.paused_duration * 60 * 1000) // Convert minutes to ms

    // Subtract current pause if active
    if (session.last_pause_start) {
      const pauseStart = new Date(session.last_pause_start)
      totalDuration -= (now.getTime() - pauseStart.getTime())
    }

    return Math.max(0, Math.round(totalDuration / (1000 * 60))) // Convert to minutes
  }

  /**
   * Pause the timer session
   */
  static pauseSession(session: TimerSession): TimerSession {
    if (!session.is_running || session.last_pause_start) return session

    return {
      ...session,
      last_pause_start: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  }

  /**
   * Resume the timer session
   */
  static resumeSession(session: TimerSession): TimerSession {
    if (!session.last_pause_start) return session

    const pauseStart = new Date(session.last_pause_start)
    const now = new Date()
    const pauseDuration = Math.round((now.getTime() - pauseStart.getTime()) / (1000 * 60))

    return {
      ...session,
      paused_duration: session.paused_duration + pauseDuration,
      last_pause_start: undefined,
      updated_at: new Date().toISOString()
    }
  }

  /**
   * Stop the timer session and convert to time entry
   */
  static stopSession(session: TimerSession): Omit<TimeEntry, 'id' | 'created_at' | 'updated_at'> {
    const endTime = new Date().toISOString()
    const duration = this.getCurrentDuration(session)

    return {
      user_id: session.user_id,
      project_id: session.project_id,
      milestone_id: session.milestone_id,
      task_id: session.task_id,
      description: session.description,
      start_time: session.start_time,
      end_time: endTime,
      duration_minutes: duration,
      billable: false, // Default to non-billable, can be changed later
      status: 'completed',
      tags: session.tags
    }
  }

  /**
   * Transform raw database response to TimerSession
   */
  static fromDatabase(data: any): TimerSession {
    return {
      id: data.id,
      user_id: data.user_id,
      project_id: data.project_id,
      milestone_id: data.milestone_id,
      task_id: data.task_id,
      description: data.description,
      start_time: data.start_time,
      end_time: data.end_time,
      is_running: data.is_running,
      paused_duration: data.paused_duration,
      last_pause_start: data.last_pause_start,
      tags: data.tags || [],
      created_at: data.created_at,
      updated_at: data.updated_at
    }
  }
}

export class TimeTrackingSettingsModel {
  /**
   * Get default settings
   */
  static getDefaults(): Omit<TimeTrackingSettings, 'user_id' | 'created_at' | 'updated_at'> {
    return {
      default_billable: false,
      default_billable_rate: 0,
      require_description: true,
      auto_stop_on_idle: false,
      idle_timeout_minutes: 30,
      weekly_hour_target: 40,
      work_days: [1, 2, 3, 4, 5], // Monday to Friday
      work_start_hour: 9,
      work_end_hour: 17,
      break_duration_minutes: 60,
      reminder_interval_minutes: 60
    }
  }

  /**
   * Validate settings
   */
  static validateSettings(settings: Partial<TimeTrackingSettings>): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (settings.weekly_hour_target != null && settings.weekly_hour_target < 0) {
      errors.push('Weekly hour target cannot be negative')
    }

    if (settings.idle_timeout_minutes != null && settings.idle_timeout_minutes < 1) {
      errors.push('Idle timeout must be at least 1 minute')
    }

    if (settings.work_start_hour != null && (settings.work_start_hour < 0 || settings.work_start_hour > 23)) {
      errors.push('Work start hour must be between 0 and 23')
    }

    if (settings.work_end_hour != null && (settings.work_end_hour < 0 || settings.work_end_hour > 23)) {
      errors.push('Work end hour must be between 0 and 23')
    }

    if (settings.work_start_hour != null && settings.work_end_hour != null &&
        settings.work_start_hour >= settings.work_end_hour) {
      errors.push('Work end hour must be after work start hour')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Transform raw database response to TimeTrackingSettings
   */
  static fromDatabase(data: any): TimeTrackingSettings {
    return {
      user_id: data.user_id,
      default_billable: data.default_billable,
      default_billable_rate: data.default_billable_rate,
      require_description: data.require_description,
      auto_stop_on_idle: data.auto_stop_on_idle,
      idle_timeout_minutes: data.idle_timeout_minutes,
      weekly_hour_target: data.weekly_hour_target,
      work_days: data.work_days || [],
      work_start_hour: data.work_start_hour,
      work_end_hour: data.work_end_hour,
      break_duration_minutes: data.break_duration_minutes,
      reminder_interval_minutes: data.reminder_interval_minutes,
      created_at: data.created_at,
      updated_at: data.updated_at
    }
  }
}
