/**
 * Real-time Events Entity Model
 * Defines the structure and operations for real-time event data
 */

export type EventType =
  | 'milestone_created'
  | 'milestone_updated'
  | 'milestone_deleted'
  | 'milestone_completed'
  | 'comment_added'
  | 'comment_deleted'
  | 'label_added'
  | 'label_removed'
  | 'member_assigned'
  | 'member_unassigned'
  | 'project_updated'
  | 'organization_updated'

export interface RealTimeEvent {
  id: string
  milestone_id: string
  user_id: string
  event_type: EventType
  data: Record<string, any>
  created_at: string
}

export interface RealTimeEventWithDetails extends RealTimeEvent {
  user_name?: string
  user_email?: string
  milestone_name?: string
  project_name?: string
}

export interface CreateEventData {
  milestone_id: string
  user_id: string
  event_type: EventType
  data?: Record<string, any>
}

export class RealTimeEventModel {
  /**
   * Validate event data before creation
   */
  static validateCreate(data: CreateEventData): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!data.milestone_id || data.milestone_id.trim().length === 0) {
      errors.push('Milestone ID is required')
    }

    if (!data.user_id || data.user_id.trim().length === 0) {
      errors.push('User ID is required')
    }

    if (!data.event_type || !this.isValidEventType(data.event_type)) {
      errors.push('Valid event type is required')
    }

    if (data.data && typeof data.data !== 'object') {
      errors.push('Event data must be an object')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Check if event type is valid
   */
  static isValidEventType(eventType: string): eventType is EventType {
    const validTypes: EventType[] = [
      'milestone_created',
      'milestone_updated',
      'milestone_deleted',
      'milestone_completed',
      'comment_added',
      'comment_deleted',
      'label_added',
      'label_removed',
      'member_assigned',
      'member_unassigned',
      'project_updated',
      'organization_updated'
    ]

    return validTypes.includes(eventType as EventType)
  }

  /**
   * Get event display text for UI
   */
  static getEventDisplayText(eventType: EventType): string {
    const displayMap: Record<EventType, string> = {
      milestone_created: 'created milestone',
      milestone_updated: 'updated milestone',
      milestone_deleted: 'deleted milestone',
      milestone_completed: 'completed milestone',
      comment_added: 'added comment',
      comment_deleted: 'deleted comment',
      label_added: 'added label',
      label_removed: 'removed label',
      member_assigned: 'assigned member',
      member_unassigned: 'unassigned member',
      project_updated: 'updated project',
      organization_updated: 'updated organization'
    }

    return displayMap[eventType] || eventType
  }

  /**
   * Get event icon for UI display
   */
  static getEventIcon(eventType: EventType): string {
    const iconMap: Record<EventType, string> = {
      milestone_created: 'plus-circle',
      milestone_updated: 'edit',
      milestone_deleted: 'trash',
      milestone_completed: 'check-circle',
      comment_added: 'message-circle',
      comment_deleted: 'message-circle-off',
      label_added: 'tag',
      label_removed: 'tag-off',
      member_assigned: 'user-plus',
      member_unassigned: 'user-minus',
      project_updated: 'folder-edit',
      organization_updated: 'building'
    }

    return iconMap[eventType] || 'activity'
  }

  /**
   * Get event color for UI display
   */
  static getEventColor(eventType: EventType): string {
    const colorMap: Record<EventType, string> = {
      milestone_created: '#10b981', // green
      milestone_updated: '#3b82f6', // blue
      milestone_deleted: '#ef4444', // red
      milestone_completed: '#059669', // emerald
      comment_added: '#6366f1', // indigo
      comment_deleted: '#dc2626', // red-600
      label_added: '#f59e0b', // amber
      label_removed: '#d97706', // amber-600
      member_assigned: '#8b5cf6', // violet
      member_unassigned: '#7c3aed', // violet-600
      project_updated: '#06b6d4', // cyan
      organization_updated: '#0891b2' // cyan-600
    }

    return colorMap[eventType] || '#6b7280'
  }

  /**
   * Check if event should trigger notifications
   */
  static shouldTriggerNotification(eventType: EventType): boolean {
    const notificationEvents: EventType[] = [
      'milestone_created',
      'milestone_completed',
      'milestone_deleted',
      'comment_added',
      'member_assigned',
      'member_unassigned'
    ]

    return notificationEvents.includes(eventType)
  }

  /**
   * Get events that should be visible to specific user types
   */
  static getVisibleEventsForUser(userRole: 'director' | 'lead' | 'member'): EventType[] {
    const allEvents: EventType[] = [
      'milestone_created',
      'milestone_updated',
      'milestone_deleted',
      'milestone_completed',
      'comment_added',
      'comment_deleted',
      'label_added',
      'label_removed',
      'member_assigned',
      'member_unassigned',
      'project_updated',
      'organization_updated'
    ]

    // Directors and leads see all events
    if (userRole === 'director' || userRole === 'lead') {
      return allEvents
    }

    // Members see limited events
    return [
      'milestone_created',
      'milestone_updated',
      'milestone_completed',
      'comment_added',
      'member_assigned'
    ]
  }

  /**
   * Group events by date for timeline display
   */
  static groupByDate(events: RealTimeEvent[]): Record<string, RealTimeEvent[]> {
    return events.reduce((groups, event) => {
      const date = new Date(event.created_at).toDateString()
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(event)
      return groups
    }, {} as Record<string, RealTimeEvent[]>)
  }

  /**
   * Sort events by creation date (newest first)
   */
  static sortByDate(events: RealTimeEvent[]): RealTimeEvent[] {
    return events.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  }

  /**
   * Transform raw database response to RealTimeEvent interface
   */
  static fromDatabase(data: any): RealTimeEvent {
    return {
      id: data.id,
      milestone_id: data.milestone_id,
      user_id: data.user_id,
      event_type: data.event_type,
      data: data.data || {},
      created_at: data.created_at
    }
  }

  /**
   * Transform RealTimeEvent interface to database format
   */
  static toDatabase(event: Partial<RealTimeEvent>): any {
    return {
      id: event.id,
      milestone_id: event.milestone_id,
      user_id: event.user_id,
      event_type: event.event_type,
      data: event.data,
      created_at: event.created_at
    }
  }

  /**
   * Transform with additional details
   */
  static fromDatabaseWithDetails(data: any): RealTimeEventWithDetails {
    return {
      id: data.id,
      milestone_id: data.milestone_id,
      user_id: data.user_id,
      event_type: data.event_type,
      data: data.data || {},
      created_at: data.created_at,
      user_name: data.user_name,
      user_email: data.user_email,
      milestone_name: data.milestone_name,
      project_name: data.project_name
    }
  }
}


