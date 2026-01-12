import type {
  ReminderOption,
  ReminderSettings,
  ReminderResult,
  ReminderValidationResult,
  ReminderNotification,
} from '../types/reminder.types'

export const useTaskReminder = {
  /**
   * Set a reminder for a task
   */
  setReminder(
    taskId: string,
    reminderDate: Date,
    option: ReminderOption = 'custom'
  ): ReminderResult<ReminderSettings> {
    // Validate task ID
    if (!taskId || taskId.trim() === '') {
      return {
        success: false,
        error: 'Task ID is required',
      }
    }

    // Validate reminder date is in the future
    const now = new Date()
    if (reminderDate <= now) {
      return {
        success: false,
        error: 'Reminder date must be in the future',
      }
    }

    // Calculate reminder time based on option
    const reminderTime = this.getReminderTime(reminderDate, option)

    return {
      success: true,
      data: {
        taskId,
        reminderAt: reminderTime.toISOString(),
        option,
      },
    }
  },

  /**
   * Remove a reminder from a task
   */
  removeReminder(taskId: string): ReminderResult<ReminderSettings> {
    if (!taskId || taskId.trim() === '') {
      return {
        success: false,
        error: 'Task ID is required',
      }
    }

    return {
      success: true,
      data: {
        taskId,
        reminderAt: null as any,
        option: null as any,
      },
    }
  },

  /**
   * Get reminder time based on option
   */
  getReminderTime(dueDate: Date, option: ReminderOption): Date {
    const reminderDate = new Date(dueDate)

    switch (option) {
      case '1hour':
        // 1 hour before due date
        reminderDate.setHours(reminderDate.getHours() - 1)
        return reminderDate
      case '1day':
        // 1 day before due date
        reminderDate.setDate(reminderDate.getDate() - 1)
        return reminderDate
      case 'custom':
      default:
        // Return the date as-is for custom
        return dueDate
    }
  },

  /**
   * Validate reminder settings
   */
  validateReminder(settings: ReminderSettings): ReminderValidationResult {
    const errors: string[] = []

    // Validate task ID
    if (!settings.taskId || settings.taskId.trim() === '') {
      errors.push('Task ID is required')
    }

    // Validate reminder date
    try {
      const date = new Date(settings.reminderAt)
      if (isNaN(date.getTime())) {
        errors.push('Invalid reminder date format')
      }
    } catch {
      errors.push('Invalid reminder date format')
    }

    // Validate option
    const validOptions: ReminderOption[] = ['1hour', '1day', 'custom']
    if (!validOptions.includes(settings.option)) {
      errors.push(`Invalid reminder option: ${settings.option}`)
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  },

  /**
   * Send reminder notification
   */
  async sendReminderNotification(
    taskId: string,
    taskName: string,
    reminderTime: Date,
    sendNotificationFn: (notification: ReminderNotification) => Promise<any>
  ): Promise<ReminderResult<ReminderNotification>> {
    try {
      const notification: ReminderNotification = {
        id: `reminder-${taskId}-${Date.now()}`,
        taskId,
        taskName,
        reminderAt: reminderTime.toISOString(),
        message: `Reminder: ${taskName}`,
        type: 'info',
        sent: false,
      }

      const result = await sendNotificationFn(notification)

      if (result.success) {
        notification.sent = true
        notification.sentAt = new Date().toISOString()
      }

      return {
        success: true,
        data: notification,
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to send reminder notification: ${error.message}`,
      }
    }
  },

  /**
   * Get all reminder options
   */
  getReminderOptions(): ReminderOption[] {
    return ['1hour', '1day', 'custom']
  },

  /**
   * Format reminder option for display
   */
  formatReminderOption(option: ReminderOption): string {
    const formats: Record<ReminderOption, string> = {
      '1hour': '1 hour before',
      '1day': '1 day before',
      custom: 'Custom date/time',
    }
    return formats[option] || option
  },
}
