import { supabase } from '@/lib/supabase'
import {
  Notification,
  NotificationPreferences,
  NotificationSummary,
  Mention,
  NotificationSettings,
  NotificationModel,
  MentionModel,
  NotificationType,
  NotificationChannel,
  NotificationPriority
} from '@/lib/models/notifications'

export class NotificationsService {
  /**
   * Create a notification
   */
  static async createNotification(
    notification: Omit<Notification, 'id' | 'created_at' | 'updated_at' | 'read_at' | 'archived_at' | 'dismissed_at'>
  ): Promise<Notification> {
    // Get user preferences to check if notification should be sent
    const preferences = await this.getUserPreferences(notification.user_id)

    if (!NotificationModel.shouldSendNotification(notification as Notification, preferences)) {
      // Create notification but mark as dismissed immediately
      const dismissedNotification = {
        ...notification,
        status: 'dismissed' as const,
        dismissed_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('notifications')
        .insert(dismissedNotification)
        .select()
        .single()

      if (error) throw error
      return NotificationModel.fromDatabase(data)
    }

    // Check quiet hours
    if (NotificationModel.isQuietHours(preferences)) {
      // Delay email notifications during quiet hours
      const emailChannels = notification.channels.filter(c => c === 'email')
      const otherChannels = notification.channels.filter(c => c !== 'email')

      if (emailChannels.length > 0 && otherChannels.length === 0) {
        // Only email, delay until end of quiet hours
        notification.channels = []
        // TODO: Schedule delayed email delivery
      }
    }

    const { data, error } = await supabase
      .from('notifications')
      .insert(notification)
      .select()
      .single()

    if (error) throw error

    const createdNotification = NotificationModel.fromDatabase(data)

    // Send to enabled channels
    await this.deliverNotification(createdNotification, preferences)

    return createdNotification
  }

  /**
   * Create notification from mention
   */
  static async createMentionNotification(
    mention: Mention,
    mentionedUserId: string,
    actorName: string,
    actorAvatar?: string
  ): Promise<Notification> {
    const notification = NotificationModel.createMentionNotification(
      mention,
      mentionedUserId,
      actorName,
      actorAvatar
    )

    return this.createNotification(notification)
  }

  /**
   * Create notification from comment
   */
  static async createCommentNotification(
    comment: any,
    entityType: string,
    entityId: string,
    actorName: string,
    actorAvatar?: string
  ): Promise<Notification> {
    const notification = NotificationModel.createCommentNotification(
      comment,
      entityType,
      entityId,
      actorName,
      actorAvatar
    )

    return this.createNotification(notification)
  }

  /**
   * Create notification from assignment
   */
  static async createAssignmentNotification(
    assigneeId: string,
    assigneeName: string,
    entityType: string,
    entityTitle: string,
    actorName: string,
    actorAvatar?: string
  ): Promise<Notification> {
    const notification = NotificationModel.createAssignmentNotification(
      assigneeId,
      assigneeName,
      entityType,
      entityTitle,
      actorName,
      actorAvatar
    )

    return this.createNotification(notification)
  }

  /**
   * Create notification from due date reminder
   */
  static async createDueDateNotification(
    userId: string,
    entityType: string,
    entityTitle: string,
    dueDate: string,
    daysUntilDue: number
  ): Promise<Notification> {
    const notification = NotificationModel.createDueDateNotification(
      userId,
      entityType,
      entityTitle,
      dueDate,
      daysUntilDue
    )

    return this.createNotification(notification)
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string, userId: string): Promise<Notification> {
    const { data, error } = await supabase
      .from('notifications')
      .update({
        status: 'read',
        read_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', notificationId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    return NotificationModel.fromDatabase(data)
  }

  /**
   * Mark multiple notifications as read
   */
  static async markMultipleAsRead(notificationIds: string[], userId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({
        status: 'read',
        read_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .in('id', notificationIds)
      .eq('user_id', userId)

    if (error) throw error
  }

  /**
   * Archive notification
   */
  static async archiveNotification(notificationId: string, userId: string): Promise<Notification> {
    const { data, error } = await supabase
      .from('notifications')
      .update({
        status: 'archived',
        archived_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', notificationId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    return NotificationModel.fromDatabase(data)
  }

  /**
   * Dismiss notification
   */
  static async dismissNotification(notificationId: string, userId: string): Promise<Notification> {
    const { data, error } = await supabase
      .from('notifications')
      .update({
        status: 'dismissed',
        dismissed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', notificationId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    return NotificationModel.fromDatabase(data)
  }

  /**
   * Get notifications for user
   */
  static async getNotifications(
    userId: string,
    filters: {
      status?: string[]
      type?: NotificationType[]
      priority?: NotificationPriority[]
      limit?: number
      offset?: number
      search?: string
    } = {}
  ): Promise<{ notifications: Notification[]; total: number }> {
    let query = supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (filters.status?.length) {
      query = query.in('status', filters.status)
    }

    if (filters.type?.length) {
      query = query.in('type', filters.type)
    }

    if (filters.priority?.length) {
      query = query.in('priority', filters.priority)
    }

    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,message.ilike.%${filters.search}%`)
    }

    if (filters.limit) {
      query = query.limit(filters.limit)
    }

    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1)
    }

    const { data, error, count } = await query

    if (error) throw error

    return {
      notifications: data?.map(n => NotificationModel.fromDatabase(n)) || [],
      total: count || 0
    }
  }

  /**
   * Get notification summary for user
   */
  static async getNotificationSummary(userId: string): Promise<NotificationSummary> {
    const { data, error } = await supabase
      .from('notifications')
      .select('status, type, priority, created_at')
      .eq('user_id', userId)

    if (error) throw error

    const summary: NotificationSummary = {
      total_unread: 0,
      total_read: 0,
      total_archived: 0,
      by_type: {} as Record<NotificationType, number>,
      by_priority: {} as Record<NotificationPriority, number>,
      recent_notifications: [],
      oldest_unread: undefined
    }

    let oldestUnread: string | undefined

    data?.forEach(notification => {
      switch (notification.status) {
        case 'unread':
          summary.total_unread++
          if (!oldestUnread || notification.created_at < oldestUnread) {
            oldestUnread = notification.created_at
          }
          break
        case 'read':
          summary.total_read++
          break
        case 'archived':
          summary.total_archived++
          break
      }

      // Count by type
      const type = notification.type as NotificationType
      summary.by_type[type] = (summary.by_type[type] || 0) + 1

      // Count by priority
      const priority = notification.priority as NotificationPriority
      summary.by_priority[priority] = (summary.by_priority[priority] || 0) + 1
    })

    summary.oldest_unread = oldestUnread

    // Get recent notifications
    const { notifications } = await this.getNotifications(userId, {
      status: ['unread'],
      limit: 5
    })
    summary.recent_notifications = notifications

    return summary
  }

  /**
   * Get user notification preferences
   */
  static async getUserPreferences(userId: string): Promise<NotificationPreferences> {
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code === 'PGRST116') {
      // Preferences don't exist, create defaults
      return this.createDefaultPreferences(userId)
    }

    if (error) throw error

    return {
      user_id: data.user_id,
      email_enabled: data.email_enabled,
      push_enabled: data.push_enabled,
      sms_enabled: data.sms_enabled,
      in_app_enabled: data.in_app_enabled,
      mention_notifications: data.mention_notifications,
      comment_notifications: data.comment_notifications,
      assignment_notifications: data.assignment_notifications,
      due_date_reminders: data.due_date_reminders,
      status_change_notifications: data.status_change_notifications,
      invitation_notifications: data.invitation_notifications,
      approval_notifications: data.approval_notifications,
      system_notifications: data.system_notifications,
      collaboration_notifications: data.collaboration_notifications,
      email_frequency: data.email_frequency,
      push_frequency: data.push_frequency,
      quiet_hours_start: data.quiet_hours_start,
      quiet_hours_end: data.quiet_hours_end,
      mention_channels: (data.mention_channels || ['in_app']) as NotificationChannel[],
      comment_channels: (data.comment_channels || ['in_app']) as NotificationChannel[],
      assignment_channels: (data.assignment_channels || ['in_app', 'email']) as NotificationChannel[],
      due_date_channels: (data.due_date_channels || ['in_app', 'email']) as NotificationChannel[],
      status_change_channels: (data.status_change_channels || ['in_app']) as NotificationChannel[],
      invitation_channels: (data.invitation_channels || ['in_app', 'email']) as NotificationChannel[],
      approval_channels: (data.approval_channels || ['in_app', 'email']) as NotificationChannel[],
      system_channels: (data.system_channels || ['in_app']) as NotificationChannel[],
      collaboration_channels: (data.collaboration_channels || ['in_app']) as NotificationChannel[],
      created_at: data.created_at,
      updated_at: data.updated_at
    }
  }

  /**
   * Update user notification preferences
   */
  static async updateUserPreferences(
    userId: string,
    updates: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    const { data, error } = await supabase
      .from('notification_preferences')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error

    return {
      user_id: data.user_id,
      email_enabled: data.email_enabled,
      push_enabled: data.push_enabled,
      sms_enabled: data.sms_enabled,
      in_app_enabled: data.in_app_enabled,
      mention_notifications: data.mention_notifications,
      comment_notifications: data.comment_notifications,
      assignment_notifications: data.assignment_notifications,
      due_date_reminders: data.due_date_reminders,
      status_change_notifications: data.status_change_notifications,
      invitation_notifications: data.invitation_notifications,
      approval_notifications: data.approval_notifications,
      system_notifications: data.system_notifications,
      collaboration_notifications: data.collaboration_notifications,
      email_frequency: data.email_frequency,
      push_frequency: data.push_frequency,
      quiet_hours_start: data.quiet_hours_start,
      quiet_hours_end: data.quiet_hours_end,
      mention_channels: (data.mention_channels || ['in_app']) as NotificationChannel[],
      comment_channels: (data.comment_channels || ['in_app']) as NotificationChannel[],
      assignment_channels: (data.assignment_channels || ['in_app', 'email']) as NotificationChannel[],
      due_date_channels: (data.due_date_channels || ['in_app', 'email']) as NotificationChannel[],
      status_change_channels: (data.status_change_channels || ['in_app']) as NotificationChannel[],
      invitation_channels: (data.invitation_channels || ['in_app', 'email']) as NotificationChannel[],
      approval_channels: (data.approval_channels || ['in_app', 'email']) as NotificationChannel[],
      system_channels: (data.system_channels || ['in_app']) as NotificationChannel[],
      collaboration_channels: (data.collaboration_channels || ['in_app']) as NotificationChannel[],
      created_at: data.created_at,
      updated_at: data.updated_at
    }
  }

  /**
   * Create default notification preferences
   */
  private static async createDefaultPreferences(userId: string): Promise<NotificationPreferences> {
    const defaults = {
      user_id: userId,
      email_enabled: true,
      push_enabled: false,
      sms_enabled: false,
      in_app_enabled: true,
      mention_notifications: true,
      comment_notifications: true,
      assignment_notifications: true,
      due_date_reminders: true,
      status_change_notifications: true,
      invitation_notifications: true,
      approval_notifications: true,
      system_notifications: true,
      collaboration_notifications: false,
      email_frequency: 'immediate' as const,
      push_frequency: 'immediate' as const,
      mention_channels: ['in_app'] as NotificationChannel[],
      comment_channels: ['in_app'] as NotificationChannel[],
      assignment_channels: ['in_app', 'email'] as NotificationChannel[],
      due_date_channels: ['in_app', 'email'] as NotificationChannel[],
      status_change_channels: ['in_app'] as NotificationChannel[],
      invitation_channels: ['in_app', 'email'] as NotificationChannel[],
      approval_channels: ['in_app', 'email'] as NotificationChannel[],
      system_channels: ['in_app'] as NotificationChannel[],
      collaboration_channels: ['in_app'] as NotificationChannel[],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('notification_preferences')
      .insert(defaults)
      .select()
      .single()

    if (error) throw error

    return defaults
  }

  /**
   * Get user notification settings
   */
  static async getUserSettings(userId: string): Promise<NotificationSettings> {
    const { data, error } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code === 'PGRST116') {
      // Settings don't exist, create defaults
      return this.createDefaultSettings(userId)
    }

    if (error) throw error

    return {
      user_id: data.user_id,
      enable_desktop_notifications: data.enable_desktop_notifications,
      enable_sound_notifications: data.enable_sound_notifications,
      show_notification_badges: data.show_notification_badges,
      auto_archive_read: data.auto_archive_read,
      archive_after_days: data.archive_after_days,
      max_notifications: data.max_notifications,
      group_similar: data.group_similar,
      created_at: data.created_at,
      updated_at: data.updated_at
    }
  }

  /**
   * Update user notification settings
   */
  static async updateUserSettings(
    userId: string,
    updates: Partial<NotificationSettings>
  ): Promise<NotificationSettings> {
    const { data, error } = await supabase
      .from('notification_settings')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error

    return {
      user_id: data.user_id,
      enable_desktop_notifications: data.enable_desktop_notifications,
      enable_sound_notifications: data.enable_sound_notifications,
      show_notification_badges: data.show_notification_badges,
      auto_archive_read: data.auto_archive_read,
      archive_after_days: data.archive_after_days,
      max_notifications: data.max_notifications,
      group_similar: data.group_similar,
      created_at: data.created_at,
      updated_at: data.updated_at
    }
  }

  /**
   * Create default notification settings
   */
  private static async createDefaultSettings(userId: string): Promise<NotificationSettings> {
    const defaults = {
      user_id: userId,
      enable_desktop_notifications: true,
      enable_sound_notifications: true,
      show_notification_badges: true,
      auto_archive_read: false,
      archive_after_days: 30,
      max_notifications: 1000,
      group_similar: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('notification_settings')
      .insert(defaults)
      .select()
      .single()

    if (error) throw error

    return defaults
  }

  /**
   * Deliver notification to enabled channels
   */
  private static async deliverNotification(
    notification: Notification,
    preferences: NotificationPreferences
  ): Promise<void> {
    const enabledChannels = notification.channels.filter(channel =>
      NotificationModel.isChannelEnabled(channel, preferences)
    )

    const promises: Promise<void>[] = []

    if (enabledChannels.includes('email')) {
      promises.push(this.sendEmailNotification(notification))
    }

    if (enabledChannels.includes('push')) {
      promises.push(this.sendPushNotification(notification))
    }

    if (enabledChannels.includes('sms')) {
      promises.push(this.sendSMSNotification(notification))
    }

    // In-app notifications are handled by the UI components

    await Promise.allSettled(promises)
  }

  /**
   * Send email notification (placeholder)
   */
  private static async sendEmailNotification(notification: Notification): Promise<void> {
    // TODO: Implement email service integration
    console.log('Sending email notification:', notification.title)
  }

  /**
   * Send push notification (placeholder)
   */
  private static async sendPushNotification(notification: Notification): Promise<void> {
    // TODO: Implement push notification service integration
    console.log('Sending push notification:', notification.title)
  }

  /**
   * Send SMS notification (placeholder)
   */
  private static async sendSMSNotification(notification: Notification): Promise<void> {
    // TODO: Implement SMS service integration
    console.log('Sending SMS notification:', notification.title)
  }

  /**
   * Process mentions from text content
   */
  static async processMentions(
    content: string,
    entityType: string,
    entityId: string,
    mentionedByUserId: string,
    mentionedByName: string,
    url: string,
    availableUsers: Array<{ id: string; username: string; display_name: string }>
  ): Promise<Mention[]> {
    const mentions = MentionModel.extractMentions(
      content,
      availableUsers,
      entityType,
      entityId,
      mentionedByUserId,
      url
    )

    // Fill in mentioned by name
    mentions.forEach(mention => {
      mention.mentioned_by_name = mentionedByName
    })

    // Save mentions to database
    if (mentions.length > 0) {
      const { data, error } = await supabase
        .from('mentions')
        .insert(mentions)
        .select()

      if (error) {
        console.error('Failed to save mentions:', error)
      } else {
        // Create notifications for mentions
        const notificationPromises = mentions.map(mention => {
          const mentionedUser = availableUsers.find(u => u.id === mention.mentioned_user_id)
          if (mentionedUser) {
            return this.createMentionNotification(
              mention,
              mention.mentioned_user_id,
              mentionedByName
            )
          }
          return null
        }).filter(Boolean)

        await Promise.allSettled(notificationPromises)
      }
    }

    return mentions
  }
}
