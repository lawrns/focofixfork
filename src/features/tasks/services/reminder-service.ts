import { supabase } from '@/lib/supabase-client'
import type {
  ReminderSettings,
  ReminderCheckResult,
  ReminderNotification,
} from '../types/reminder.types'

interface ReminderWithTask {
  id: string
  task_id: string
  user_id: string
  reminder_at: string
  option: string
  sent: boolean
  sent_at: string | null
  task_title: string
}

export class ReminderService {
  /**
   * Set a reminder for a task
   */
  static async setReminder(
    userId: string,
    taskId: string,
    reminderAt: Date,
    option: string = 'custom'
  ): Promise<{
    success: boolean
    data?: ReminderSettings
    error?: string
  }> {
    try {
      if (!userId || !taskId) {
        return {
          success: false,
          error: 'User ID and Task ID are required',
        }
      }

      // Update task with reminder_at
      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .update({ reminder_at: reminderAt.toISOString() })
        .eq('id', taskId)
        .select()
        .single()

      if (taskError) {
        return {
          success: false,
          error: `Failed to update task: ${taskError.message}`,
        }
      }

      // Create reminder record
      const { data: reminderData, error: reminderError } = await supabase
        .from('task_reminders')
        .insert({
          task_id: taskId,
          user_id: userId,
          reminder_at: reminderAt.toISOString(),
          option,
          sent: false,
        })
        .select()
        .single()

      if (reminderError) {
        return {
          success: false,
          error: `Failed to create reminder: ${reminderError.message}`,
        }
      }

      return {
        success: true,
        data: {
          taskId,
          reminderAt: reminderAt.toISOString(),
          option: option as any,
        },
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to set reminder',
      }
    }
  }

  /**
   * Remove a reminder from a task
   */
  static async removeReminder(
    userId: string,
    taskId: string
  ): Promise<{
    success: boolean
    error?: string
  }> {
    try {
      if (!userId || !taskId) {
        return {
          success: false,
          error: 'User ID and Task ID are required',
        }
      }

      // Update task to remove reminder
      const { error: taskError } = await supabase
        .from('tasks')
        .update({ reminder_at: null })
        .eq('id', taskId)

      if (taskError) {
        return {
          success: false,
          error: `Failed to update task: ${taskError.message}`,
        }
      }

      // Delete reminder records
      const { error: reminderError } = await supabase
        .from('task_reminders')
        .delete()
        .eq('task_id', taskId)
        .eq('user_id', userId)

      if (reminderError) {
        return {
          success: false,
          error: `Failed to delete reminder: ${reminderError.message}`,
        }
      }

      return {
        success: true,
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to remove reminder',
      }
    }
  }

  /**
   * Get pending reminders that need to be sent
   */
  static async getPendingReminders(): Promise<{
    success: boolean
    data?: ReminderWithTask[]
    error?: string
  }> {
    try {
      const now = new Date()

      // Get all unsent reminders where reminder_at <= now
      const { data, error } = await supabase
        .from('task_reminders')
        .select(
          `
          id,
          task_id,
          user_id,
          reminder_at,
          option,
          sent,
          sent_at,
          tasks!inner(title)
        `
        )
        .eq('sent', false)
        .lte('reminder_at', now.toISOString())
        .order('reminder_at', { ascending: true })

      if (error) {
        return {
          success: false,
          error: error.message,
        }
      }

      // Format the response
      const reminders = (data || []).map((reminder: any) => ({
        id: reminder.id,
        task_id: reminder.task_id,
        user_id: reminder.user_id,
        reminder_at: reminder.reminder_at,
        option: reminder.option,
        sent: reminder.sent,
        sent_at: reminder.sent_at,
        task_title: reminder.tasks?.title || 'Untitled Task',
      }))

      return {
        success: true,
        data: reminders,
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get pending reminders',
      }
    }
  }

  /**
   * Mark reminder as sent and create notification
   */
  static async markReminderAsSent(
    reminderId: string,
    userId: string,
    taskId: string,
    taskName: string
  ): Promise<{
    success: boolean
    error?: string
  }> {
    try {
      // Update reminder as sent
      const { error: reminderError } = await supabase
        .from('task_reminders')
        .update({ sent: true, sent_at: new Date().toISOString() })
        .eq('id', reminderId)

      if (reminderError) {
        return {
          success: false,
          error: `Failed to mark reminder as sent: ${reminderError.message}`,
        }
      }

      // Create notification
      const { error: notificationError } = await supabase
        .from('reminder_notifications')
        .insert({
          task_id: taskId,
          user_id: userId,
          reminder_id: reminderId,
          notification_type: 'in-app',
          message: `Reminder: ${taskName}`,
          sent: true,
          sent_at: new Date().toISOString(),
        })

      if (notificationError) {
        console.error('Failed to create notification:', notificationError)
        // Don't fail the entire operation if notification creation fails
      }

      return {
        success: true,
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to mark reminder as sent',
      }
    }
  }

  /**
   * Check and send pending reminders (cron job)
   */
  static async checkAndSendReminders(): Promise<ReminderCheckResult> {
    const result: ReminderCheckResult = {
      checked: 0,
      sent: 0,
      failed: 0,
      errors: [],
    }

    try {
      // Get pending reminders
      const { success, data: reminders, error } = await this.getPendingReminders()

      if (!success || !reminders) {
        result.errors.push(error || 'Failed to get pending reminders')
        return result
      }

      result.checked = reminders.length

      // Process each reminder
      for (const reminder of reminders) {
        try {
          const markResult = await this.markReminderAsSent(
            reminder.id,
            reminder.user_id,
            reminder.task_id,
            reminder.task_title
          )

          if (markResult.success) {
            result.sent++
          } else {
            result.failed++
            result.errors.push(`Failed to send reminder ${reminder.id}: ${markResult.error}`)
          }
        } catch (error: any) {
          result.failed++
          result.errors.push(`Error processing reminder ${reminder.id}: ${error.message}`)
        }
      }

      return result
    } catch (error: any) {
      result.errors.push(error.message || 'Unknown error in checkAndSendReminders')
      return result
    }
  }

  /**
   * Get reminders for a specific task
   */
  static async getTaskReminders(
    taskId: string
  ): Promise<{
    success: boolean
    data?: any[]
    error?: string
  }> {
    try {
      const { data, error } = await supabase
        .from('task_reminders')
        .select('*')
        .eq('task_id', taskId)
        .order('reminder_at', { ascending: true })

      if (error) {
        return {
          success: false,
          error: error.message,
        }
      }

      return {
        success: true,
        data: data || [],
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get task reminders',
      }
    }
  }

  /**
   * Get notifications for a user
   */
  static async getUserNotifications(
    userId: string,
    limit: number = 10
  ): Promise<{
    success: boolean
    data?: ReminderNotification[]
    error?: string
  }> {
    try {
      const { data, error } = await supabase
        .from('reminder_notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        return {
          success: false,
          error: error.message,
        }
      }

      return {
        success: true,
        data: (data || []) as ReminderNotification[],
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get notifications',
      }
    }
  }
}
