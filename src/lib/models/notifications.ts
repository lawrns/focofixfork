/**
 * Notifications and @Mentions Entity Models
 * Defines the structure and operations for notifications system
 */

export type NotificationType =
  | 'mention'          // @username in comments
  | 'comment'          // New comment on your content
  | 'reply'            // Reply to your comment
  | 'assignment'       // Task/project assigned to you
  | 'due_date'         // Upcoming due date reminder
  | 'status_change'    // Status change on your items
  | 'invitation'       // Team invitation
  | 'approval'         // Time entry approval/rejection
  | 'system'           // System announcements
  | 'collaboration'    // Real-time collaboration events

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent'

export type NotificationStatus = 'unread' | 'read' | 'archived' | 'dismissed'

export type NotificationChannel = 'in_app' | 'email' | 'push' | 'sms'

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  message: string
  data: NotificationData
  priority: NotificationPriority
  status: NotificationStatus
  channels: NotificationChannel[]
  read_at?: string
  archived_at?: string
  dismissed_at?: string
  created_at: string
  updated_at: string
  expires_at?: string
}

export interface NotificationData {
  entity_type?: 'project' | 'milestone' | 'task' | 'comment' | 'time_entry' | 'organization'
  entity_id?: string
  actor_id?: string
  actor_name?: string
  actor_avatar?: string
  action_url?: string
  metadata?: Record<string, any>
}

export interface NotificationPreferences {
  user_id: string
  email_enabled: boolean
  push_enabled: boolean
  sms_enabled: boolean
  in_app_enabled: boolean

  // Notification type preferences
  mention_notifications: boolean
  comment_notifications: boolean
  assignment_notifications: boolean
  due_date_reminders: boolean
  status_change_notifications: boolean
  invitation_notifications: boolean
  approval_notifications: boolean
  system_notifications: boolean
  collaboration_notifications: boolean

  // Frequency settings
  email_frequency: 'immediate' | 'daily' | 'weekly'
  push_frequency: 'immediate' | 'batched'
  quiet_hours_start?: string // HH:MM format
  quiet_hours_end?: string // HH:MM format

  // Channel preferences by type
  mention_channels: NotificationChannel[]
  comment_channels: NotificationChannel[]
  assignment_channels: NotificationChannel[]
  due_date_channels: NotificationChannel[]
  status_change_channels: NotificationChannel[]
  invitation_channels: NotificationChannel[]
  approval_channels: NotificationChannel[]
  system_channels: NotificationChannel[]
  collaboration_channels: NotificationChannel[]

  created_at: string
  updated_at: string
}

export interface NotificationSummary {
  total_unread: number
  total_read: number
  total_archived: number
  by_type: Record<NotificationType, number>
  by_priority: Record<NotificationPriority, number>
  recent_notifications: Notification[]
  oldest_unread?: string
}

export interface Mention {
  id: string
  notification_id?: string
  mentioned_user_id: string
  mentioned_by_user_id: string
  mentioned_by_name: string
  entity_type: 'project' | 'milestone' | 'task' | 'comment' | 'time_entry' | 'organization'
  entity_id: string
  content: string
  content_excerpt: string
  position: number
  length: number
  url: string
  read_at?: string
  created_at: string
}

export interface NotificationSettings {
  user_id: string
  enable_desktop_notifications: boolean
  enable_sound_notifications: boolean
  show_notification_badges: boolean
  auto_archive_read: boolean
  archive_after_days: number
  max_notifications: number
  group_similar: boolean
  created_at: string
  updated_at: string
}

export class NotificationModel {
  /**
   * Create notification from mention
   */
  static createMentionNotification(
    mention: Mention,
    mentionedUserId: string,
    actorName: string,
    actorAvatar?: string
  ): Omit<Notification, 'id' | 'created_at' | 'updated_at' | 'read_at' | 'archived_at' | 'dismissed_at'> {
    return {
      user_id: mentionedUserId,
      type: 'mention',
      title: `${actorName} mentioned you`,
      message: `"${mention.content_excerpt}"`,
      data: {
        entity_type: mention.entity_type,
        entity_id: mention.entity_id,
        actor_id: mention.mentioned_by_user_id,
        actor_name: actorName,
        actor_avatar: actorAvatar,
        action_url: mention.url,
        metadata: {
          mention_id: mention.id,
          position: mention.position,
          length: mention.length
        }
      },
      priority: 'normal',
      status: 'unread',
      channels: ['in_app']
    }
  }

  /**
   * Create notification from comment
   */
  static createCommentNotification(
    comment: any,
    entityType: string,
    entityId: string,
    actorName: string,
    actorAvatar?: string
  ): Omit<Notification, 'id' | 'created_at' | 'updated_at' | 'read_at' | 'archived_at' | 'dismissed_at'> {
    return {
      user_id: comment.author_id, // This would be the entity owner
      type: 'comment',
      title: `New comment on ${entityType}`,
      message: `${actorName}: "${comment.content.substring(0, 100)}${comment.content.length > 100 ? '...' : ''}"`,
      data: {
        entity_type: entityType as any,
        entity_id: entityId,
        actor_id: comment.author_id,
        actor_name: actorName,
        actor_avatar: actorAvatar,
        action_url: `/comments/${comment.id}`
      },
      priority: 'normal',
      status: 'unread',
      channels: ['in_app']
    }
  }

  /**
   * Create notification from assignment
   */
  static createAssignmentNotification(
    assigneeId: string,
    assigneeName: string,
    entityType: string,
    entityTitle: string,
    actorName: string,
    actorAvatar?: string
  ): Omit<Notification, 'id' | 'created_at' | 'updated_at' | 'read_at' | 'archived_at' | 'dismissed_at'> {
    return {
      user_id: assigneeId,
      type: 'assignment',
      title: `New ${entityType} assignment`,
      message: `${actorName} assigned you to "${entityTitle}"`,
      data: {
        entity_type: entityType as any,
        actor_name: actorName,
        actor_avatar: actorAvatar
      },
      priority: 'high',
      status: 'unread',
      channels: ['in_app', 'email']
    }
  }

  /**
   * Create notification from due date reminder
   */
  static createDueDateNotification(
    userId: string,
    entityType: string,
    entityTitle: string,
    dueDate: string,
    daysUntilDue: number
  ): Omit<Notification, 'id' | 'created_at' | 'updated_at' | 'read_at' | 'archived_at' | 'dismissed_at'> {
    const priority: NotificationPriority = daysUntilDue <= 1 ? 'urgent' : daysUntilDue <= 3 ? 'high' : 'normal'

    return {
      user_id: userId,
      type: 'due_date',
      title: `${entityType} due ${daysUntilDue === 0 ? 'today' : daysUntilDue === 1 ? 'tomorrow' : `in ${daysUntilDue} days`}`,
      message: `"${entityTitle}" is due on ${new Date(dueDate).toLocaleDateString()}`,
      data: {
        entity_type: entityType as any,
        metadata: { due_date: dueDate, days_until_due: daysUntilDue }
      },
      priority,
      status: 'unread',
      channels: ['in_app', 'email']
    }
  }

  /**
   * Check if notification should be sent based on user preferences
   */
  static shouldSendNotification(
    notification: Notification,
    preferences: NotificationPreferences
  ): boolean {
    // Check if notification type is enabled
    const typeEnabled = this.isNotificationTypeEnabled(notification.type, preferences)
    if (!typeEnabled) return false

    // Check if any of the preferred channels are enabled
    const preferredChannels = this.getPreferredChannels(notification.type, preferences)
    const enabledChannels = preferredChannels.filter(channel =>
      this.isChannelEnabled(channel, preferences)
    )

    return enabledChannels.length > 0
  }

  /**
   * Check if notification type is enabled in preferences
   */
  private static isNotificationTypeEnabled(
    type: NotificationType,
    preferences: NotificationPreferences
  ): boolean {
    const typeMap: Record<NotificationType, keyof NotificationPreferences> = {
      mention: 'mention_notifications',
      comment: 'comment_notifications',
      reply: 'comment_notifications', // Treat replies as comments
      assignment: 'assignment_notifications',
      due_date: 'due_date_reminders',
      status_change: 'status_change_notifications',
      invitation: 'invitation_notifications',
      approval: 'approval_notifications',
      system: 'system_notifications',
      collaboration: 'collaboration_notifications'
    }

    const preferenceKey = typeMap[type]
    return preferences[preferenceKey] as boolean
  }

  /**
   * Get preferred channels for notification type
   */
  private static getPreferredChannels(
    type: NotificationType,
    preferences: NotificationPreferences
  ): NotificationChannel[] {
    const channelMap: Record<NotificationType, keyof NotificationPreferences> = {
      mention: 'mention_channels',
      comment: 'comment_channels',
      reply: 'comment_channels',
      assignment: 'assignment_channels',
      due_date: 'due_date_channels',
      status_change: 'status_change_channels',
      invitation: 'invitation_channels',
      approval: 'approval_channels',
      system: 'system_channels',
      collaboration: 'collaboration_channels'
    }

    const channelKey = channelMap[type]
    return preferences[channelKey] as NotificationChannel[]
  }

  /**
   * Check if channel is enabled in preferences
   */
  static isChannelEnabled(
    channel: NotificationChannel,
    preferences: NotificationPreferences
  ): boolean {
    const channelMap: Record<NotificationChannel, keyof NotificationPreferences> = {
      in_app: 'in_app_enabled',
      email: 'email_enabled',
      push: 'push_enabled',
      sms: 'sms_enabled'
    }

    const preferenceKey = channelMap[channel]
    return preferences[preferenceKey] as boolean
  }

  /**
   * Check if current time is within quiet hours
   */
  static isQuietHours(preferences: NotificationPreferences): boolean {
    if (!preferences.quiet_hours_start || !preferences.quiet_hours_end) {
      return false
    }

    const now = new Date()
    const currentTime = now.getHours() * 100 + now.getMinutes()

    const startTime = this.timeStringToMinutes(preferences.quiet_hours_start)
    const endTime = this.timeStringToMinutes(preferences.quiet_hours_end)

    if (startTime < endTime) {
      // Same day quiet hours
      return currentTime >= startTime && currentTime <= endTime
    } else {
      // Overnight quiet hours
      return currentTime >= startTime || currentTime <= endTime
    }
  }

  /**
   * Convert HH:MM time string to minutes since midnight
   */
  private static timeStringToMinutes(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number)
    return hours * 60 + minutes
  }

  /**
   * Get notification priority color
   */
  static getPriorityColor(priority: NotificationPriority): string {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-50 border-red-200'
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'normal': return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'low': return 'text-gray-600 bg-gray-50 border-gray-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  /**
   * Get notification type icon
   */
  static getTypeIcon(type: NotificationType): string {
    switch (type) {
      case 'mention': return 'AtSign'
      case 'comment': return 'MessageCircle'
      case 'reply': return 'Reply'
      case 'assignment': return 'UserPlus'
      case 'due_date': return 'Calendar'
      case 'status_change': return 'RefreshCw'
      case 'invitation': return 'Mail'
      case 'approval': return 'CheckCircle'
      case 'system': return 'Settings'
      case 'collaboration': return 'Users'
      default: return 'Bell'
    }
  }

  /**
   * Format notification age
   */
  static formatAge(timestamp: string): string {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMinutes / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMinutes < 1) return 'just now'
    if (diffMinutes < 60) return `${diffMinutes}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`

    return date.toLocaleDateString()
  }

  /**
   * Transform raw database response to Notification
   */
  static fromDatabase(data: any): Notification {
    return {
      id: data.id,
      user_id: data.user_id,
      type: data.type,
      title: data.title,
      message: data.message,
      data: data.data || {},
      priority: data.priority,
      status: data.status,
      channels: data.channels || [],
      read_at: data.read_at,
      archived_at: data.archived_at,
      dismissed_at: data.dismissed_at,
      created_at: data.created_at,
      updated_at: data.updated_at,
      expires_at: data.expires_at
    }
  }
}

export class MentionModel {
  /**
   * Extract mentions from text content
   */
  static extractMentions(
    content: string,
    users: Array<{ id: string; username: string; display_name: string }>,
    entityType: string,
    entityId: string,
    mentionedByUserId: string,
    url: string
  ): Mention[] {
    const mentions: Mention[] = []
    const mentionRegex = /@(\w+)/g
    let match

    while ((match = mentionRegex.exec(content)) !== null) {
      const username = match[1]
      const user = users.find(u => u.username === username)

      if (user) {
        const mention: Mention = {
          id: `mention_${Date.now()}_${mentions.length}_${Math.random().toString(36).substr(2, 9)}`,
          mentioned_user_id: user.id,
          mentioned_by_user_id: mentionedByUserId,
          mentioned_by_name: '', // Will be filled by caller
          entity_type: entityType as any,
          entity_id: entityId,
          content: content,
          content_excerpt: this.getExcerpt(content, match.index, match[0].length),
          position: match.index,
          length: match[0].length,
          url: url,
          created_at: new Date().toISOString()
        }

        mentions.push(mention)
      }
    }

    return mentions
  }

  /**
   * Get excerpt around mention position
   */
  private static getExcerpt(content: string, position: number, length: number, contextLength: number = 50): string {
    const start = Math.max(0, position - contextLength)
    const end = Math.min(content.length, position + length + contextLength)

    let excerpt = content.substring(start, end)

    if (start > 0) excerpt = '...' + excerpt
    if (end < content.length) excerpt = excerpt + '...'

    return excerpt
  }

  /**
   * Transform raw database response to Mention
   */
  static fromDatabase(data: any): Mention {
    return {
      id: data.id,
      notification_id: data.notification_id,
      mentioned_user_id: data.mentioned_user_id,
      mentioned_by_user_id: data.mentioned_by_user_id,
      mentioned_by_name: data.mentioned_by_name,
      entity_type: data.entity_type,
      entity_id: data.entity_id,
      content: data.content,
      content_excerpt: data.content_excerpt,
      position: data.position,
      length: data.length,
      url: data.url,
      read_at: data.read_at,
      created_at: data.created_at
    }
  }
}
