import { supabase } from '@/lib/supabase-client'
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
import { getWhatsAppService } from './whatsapp'
import { WhatsAppUserLinkRepository } from '@/lib/repositories/whatsapp-user-link-repository'
import { createClient } from '@supabase/supabase-js'

// Use untyped supabase client to avoid type instantiation depth issues
const untypedSupabase = supabase as any

// Database row types for notification queries
interface NotificationSummaryRow {
  is_read: boolean | null
  type: string | null
  created_at: string | null
}

export class NotificationsService {
  /**
   * Create a notification
   */
  static async createNotification(
    notification: Omit<Notification, 'id' | 'created_at'>
  ): Promise<Notification> {
    // Get user preferences to check if notification should be sent
    const preferences = await this.getUserPreferences(notification.user_id)

    if (!NotificationModel.shouldSendNotification(notification as Notification, preferences)) {
      // Create notification but mark as read immediately (since no dismissed status)
      // Map notification to inbox_items schema
      const inboxItem = {
        workspace_id: (notification as any).workspace_id || '00000000-0000-0000-0000-000000000000', // Default workspace for system notifications
        user_id: notification.user_id,
        type: notification.type,
        title: notification.title,
        body: notification.message,
        metadata: notification.data as any,
        is_read: true
      }

      const { data, error } = await untypedSupabase
        .from('inbox_items')
        .insert(inboxItem)
        .select()
        .single()

      if (error) throw error
      return NotificationModel.fromDatabase(data)
    }

    // Check quiet hours
    if (NotificationModel.isQuietHours(preferences)) {
      // Delay email notifications during quiet hours
      const emailChannels = (notification.channels || []).filter(c => c === 'email')
      const otherChannels = (notification.channels || []).filter(c => c !== 'email')

      if (emailChannels.length > 0 && otherChannels.length === 0) {
        // Only email, delay until end of quiet hours
        notification.channels = []
        // TODO: Schedule delayed email delivery
      }
    }

    // Map notification to inbox_items schema
    const inboxItem = {
      workspace_id: (notification as any).workspace_id || '00000000-0000-0000-0000-000000000000', // Default workspace for system notifications
      user_id: notification.user_id,
      type: notification.type,
      title: notification.title,
      body: notification.message,
      metadata: notification.data as any,
      is_read: false
    }

    const { data, error } = await untypedSupabase
      .from('inbox_items')
      .insert(inboxItem)
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
    const { data, error } = await untypedSupabase
      .from('inbox_items')
      .update({
        is_read: true
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
    const { error } = await untypedSupabase
      .from('inbox_items')
      .update({
        is_read: true
      })
      .in('id', notificationIds)
      .eq('user_id', userId)

    if (error) throw error
  }

  /**
   * Archive notification (not supported by current database schema)
   */
  static async archiveNotification(notificationId: string, userId: string): Promise<Notification> {
    throw new Error('Archive functionality not supported by current database schema')
  }

  /**
   * Dismiss notification (not supported by current database schema)
   */
  static async dismissNotification(notificationId: string, userId: string): Promise<Notification> {
    throw new Error('Dismiss functionality not supported by current database schema')
  }

  /**
   * Get notifications for user
   */
  static async getNotifications(
    userId: string,
    filters: {
      is_read?: boolean[]
      type?: NotificationType[]
      limit?: number
      offset?: number
      search?: string
    } = {}
  ): Promise<{ notifications: Notification[]; total: number }> {
    let query = supabase
      .from('inbox_items')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (filters.is_read !== undefined && filters.is_read.length > 0) {
      if (filters.is_read.length === 1) {
        query = query.eq('is_read', filters.is_read[0])
      } else {
        query = query.in('is_read', filters.is_read)
      }
    }

    if (filters.type?.length) {
      query = query.in('type', filters.type)
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
    const { data, error } = await untypedSupabase
      .from('inbox_items')
      .select('is_read, type, created_at')
      .eq('user_id', userId)

    if (error) throw error

    const summary: NotificationSummary = {
      total_unread: 0,
      total_read: 0,
      by_type: {} as Record<NotificationType, number>,
      recent_notifications: [],
      oldest_unread: undefined
    }

    let oldestUnread: string | undefined

    ;(data || []).forEach((notification: NotificationSummaryRow) => {
      if (notification.is_read) {
        summary.total_read++
      } else {
        summary.total_unread++
        if (!oldestUnread || (notification.created_at && notification.created_at < oldestUnread)) {
          oldestUnread = notification.created_at || undefined
        }
      }

      // Count by type
      const type = notification.type as NotificationType
      summary.by_type[type] = (summary.by_type[type] || 0) + 1
    })

    summary.oldest_unread = oldestUnread

    // Get recent notifications
    const { notifications } = await this.getNotifications(userId, {
      is_read: [false],
      limit: 5
    })
    summary.recent_notifications = notifications

    return summary
  }

  /**
   * Get user notification preferences
   */
  static async getUserPreferences(userId: string): Promise<NotificationPreferences> {
    // Since notification_preferences table doesn't exist, return defaults
    return this.createDefaultPreferences(userId)
  }

  /**
   * Update user notification preferences
   */
  static async updateUserPreferences(
    userId: string,
    updates: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    // Since notification_preferences table doesn't exist, return updated defaults
    const current = await this.getUserPreferences(userId)
    return { ...current, ...updates, updated_at: new Date().toISOString() }
  }

  /**
   * Create default notification preferences
   */
  private static async createDefaultPreferences(userId: string): Promise<NotificationPreferences> {
    return {
      user_id: userId,
      email_enabled: true,
      push_enabled: false,
      sms_enabled: false,
      in_app_enabled: true,
      whatsapp_enabled: false,
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
  }

  /**
   * Get user notification settings
   */
  static async getUserSettings(userId: string): Promise<NotificationSettings> {
    // Since notification_settings table doesn't exist, return defaults
    return this.createDefaultSettings(userId)
  }

  /**
   * Update user notification settings
   */
  static async updateUserSettings(
    userId: string,
    updates: Partial<NotificationSettings>
  ): Promise<NotificationSettings> {
    // Since notification_settings table doesn't exist, return updated defaults
    const current = await this.getUserSettings(userId)
    return { ...current, ...updates, updated_at: new Date().toISOString() }
  }

  /**
   * Create default notification settings
   */
  private static async createDefaultSettings(userId: string): Promise<NotificationSettings> {
    return {
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
  }

  /**
   * Deliver notification to enabled channels
   */
  private static async deliverNotification(
    notification: Notification,
    preferences: NotificationPreferences
  ): Promise<void> {
    const enabledChannels = (notification.channels || []).filter(channel =>
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

    // WhatsApp notifications (check if user has WhatsApp linked)
    if (preferences.whatsapp_enabled !== false) {
      promises.push(this.sendWhatsAppNotification(notification))
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
   * Send WhatsApp notification via Meta Cloud API
   */
  private static async sendWhatsAppNotification(notification: Notification): Promise<void> {
    try {
      // Get WhatsApp link for user
      const supabaseServiceClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      const linkRepo = new WhatsAppUserLinkRepository(supabaseServiceClient)
      const linkResult = await linkRepo.findByUserId(notification.user_id)

      if (!linkResult.ok || !linkResult.data || !linkResult.data.verified) {
        // User doesn't have WhatsApp linked or not verified
        return
      }

      const link = linkResult.data
      const whatsAppService = getWhatsAppService()

      // Get template name and variables based on notification type
      const { templateName, languageCode, components } = this.getWhatsAppTemplateForNotification(notification)

      if (!templateName) {
        console.warn('No WhatsApp template for notification type:', notification.type)
        return
      }

      // Send template message
      await whatsAppService.sendTemplate({
        to: link.phone,
        templateName,
        languageCode,
        components,
      })

      console.log('✅ WhatsApp notification sent:', notification.title)
    } catch (error) {
      console.error('Failed to send WhatsApp notification:', error)
      // Don't throw - notification delivery should be best-effort
    }
  }

  /**
   * Map notification to WhatsApp template
   */
  private static getWhatsAppTemplateForNotification(notification: Notification): {
    templateName: string | null
    languageCode: 'en' | 'es'
    components: any[]
  } {
    // Default to English (could be enhanced to detect user language preference)
    const languageCode: 'en' | 'es' = 'en'
    const data = notification.data || {}

    let templateName: string | null = null
    let components: any[] = []

    switch (notification.type) {
      case 'assignment':
        templateName = `task_assigned_${languageCode}`
        components = [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: data.assignee_name || 'You' },
              { type: 'text', text: data.task_title || notification.title },
              { type: 'text', text: data.project_name || 'Project' },
              { type: 'text', text: data.task_url || process.env.NEXT_PUBLIC_BASE_URL || '' },
            ],
          },
        ]
        break

      case 'mention':
        templateName = `mention_notification_${languageCode}`
        components = [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: data.mentioner_name || 'Someone' },
              { type: 'text', text: data.entity_type || 'a comment' },
              { type: 'text', text: notification.message?.substring(0, 100) || '' },
              { type: 'text', text: data.url || process.env.NEXT_PUBLIC_BASE_URL || '' },
            ],
          },
        ]
        break

      case 'comment':
        templateName = `comment_notification_${languageCode}`
        components = [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: data.commenter_name || 'Someone' },
              { type: 'text', text: data.entity_name || 'an item' },
              { type: 'text', text: notification.message?.substring(0, 100) || '' },
              { type: 'text', text: data.url || process.env.NEXT_PUBLIC_BASE_URL || '' },
            ],
          },
        ]
        break

      case 'due_date':
        // Not implemented yet - could add template later
        templateName = null
        break

      default:
        templateName = null
        break
    }

    return { templateName, languageCode, components }
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

    // Save mentions to database (disabled - mentions table not in schema)
    if (mentions.length > 0) {
      console.warn('Mentions functionality disabled - mentions table not found in schema')
      // Create notifications for mentions without saving to DB
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

    return mentions
  }
}
