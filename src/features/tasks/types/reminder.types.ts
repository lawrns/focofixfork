// Reminder option types
export type ReminderOption = '1hour' | '1day' | 'custom'

// Reminder settings interface
export interface ReminderSettings {
  taskId: string
  reminderAt: string // ISO string
  option: ReminderOption
}

// Reminder result interface
export interface ReminderResult<T = any> {
  success: boolean
  data?: T
  error?: string
}

// Reminder validation result
export interface ReminderValidationResult {
  valid: boolean
  errors: string[]
}

// Notification interface
export interface ReminderNotification {
  id: string
  taskId: string
  taskName: string
  reminderAt: string
  message: string
  type: 'info' | 'warning' | 'success'
  sent: boolean
  sentAt?: string
}

// Cron job reminder check
export interface ReminderCheckResult {
  checked: number
  sent: number
  failed: number
  errors: string[]
}
