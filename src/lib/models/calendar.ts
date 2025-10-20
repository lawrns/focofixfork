export interface CalendarEvent {
  id: string
  title: string
  description?: string
  start: Date
  end: Date
  allDay: boolean
  location?: string
  attendees?: CalendarAttendee[]
  reminders?: CalendarReminder[]
  status: 'confirmed' | 'tentative' | 'cancelled'
  visibility: 'public' | 'private' | 'confidential'
  
  // Foco-specific fields
  source: 'foco' | 'external'
  sourceId?: string // ID from external calendar system
  sourceType?: 'google' | 'outlook' | 'apple' | 'caldav'
  sourceUrl?: string
  
  // Related entities
  projectId?: string
  taskId?: string
  milestoneId?: string
  
  // Metadata
  createdBy: string
  createdAt: string
  updatedAt: string
  lastSyncedAt?: string
  
  // Sync settings
  syncEnabled: boolean
  syncDirection: 'foco_to_external' | 'external_to_foco' | 'bidirectional'
  externalCalendarId?: string
}

export interface CalendarAttendee {
  id: string
  email: string
  name?: string
  responseStatus: 'accepted' | 'declined' | 'tentative' | 'needsAction'
  optional: boolean
  organizer: boolean
}

export interface CalendarReminder {
  id: string
  method: 'email' | 'popup' | 'sms'
  minutes: number
}

export interface CalendarIntegration {
  id: string
  userId: string
  provider: 'google' | 'outlook' | 'apple' | 'caldav'
  providerId: string
  providerName: string
  providerEmail: string
  
  // Authentication
  accessToken: string
  refreshToken?: string
  tokenExpiresAt?: string
  
  // Sync settings
  syncEnabled: boolean
  syncDirection: 'foco_to_external' | 'external_to_foco' | 'bidirectional'
  syncFrequency: 'realtime' | 'hourly' | 'daily'
  lastSyncAt?: string
  
  // Calendar selection
  selectedCalendars: string[]
  defaultCalendarId?: string
  
  // Metadata
  createdAt: string
  updatedAt: string
  lastError?: string
  errorCount: number
}

export interface ExternalCalendar {
  id: string
  name: string
  description?: string
  color?: string
  accessRole: 'owner' | 'writer' | 'reader' | 'freeBusyReader'
  selected: boolean
  primary: boolean
  timeZone: string
  backgroundColor?: string
  foregroundColor?: string
}

export interface CalendarView {
  type: 'month' | 'week' | 'day' | 'agenda'
  date: Date
  timeZone: string
  showWeekends: boolean
  workingHours: {
    start: string // HH:MM format
    end: string // HH:MM format
    days: number[] // 0-6, Sunday-Saturday
  }
}

export interface CalendarFilter {
  projects?: string[]
  tasks?: string[]
  milestones?: string[]
  users?: string[]
  eventTypes?: string[]
  status?: string[]
  sources?: string[]
}

export interface CalendarSyncJob {
  id: string
  integrationId: string
  userId: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  type: 'full' | 'incremental' | 'manual'
  
  // Progress tracking
  totalEvents: number
  processedEvents: number
  createdEvents: number
  updatedEvents: number
  deletedEvents: number
  errorEvents: number
  
  // Timing
  startedAt: string
  completedAt?: string
  estimatedCompletion?: string
  
  // Error handling
  errors: CalendarSyncError[]
  retryCount: number
  maxRetries: number
}

export interface CalendarSyncError {
  id: string
  jobId: string
  eventId?: string
  errorType: 'authentication' | 'permission' | 'validation' | 'network' | 'quota' | 'unknown'
  errorMessage: string
  errorDetails?: any
  timestamp: string
  resolved: boolean
}

export interface CalendarAnalytics {
  userId: string
  period: 'day' | 'week' | 'month' | 'year'
  startDate: string
  endDate: string
  
  // Event statistics
  totalEvents: number
  focoEvents: number
  externalEvents: number
  allDayEvents: number
  timedEvents: number
  
  // Sync statistics
  syncOperations: number
  successfulSyncs: number
  failedSyncs: number
  syncSuccessRate: number
  
  // Usage patterns
  mostActiveDay: string
  mostActiveHour: number
  averageEventsPerDay: number
  longestEventDuration: number
  
  // Integration statistics
  activeIntegrations: number
  totalIntegrations: number
  mostUsedProvider: string
  
  // Performance metrics
  averageSyncTime: number
  fastestSyncTime: number
  slowestSyncTime: number
}

// Calendar event creation/update payloads
export interface CreateCalendarEventData {
  title: string
  description?: string
  start: Date
  end: Date
  allDay?: boolean
  location?: string
  attendees?: Omit<CalendarAttendee, 'id'>[]
  reminders?: Omit<CalendarReminder, 'id'>[]
  status?: 'confirmed' | 'tentative' | 'cancelled'
  visibility?: 'public' | 'private' | 'confidential'
  
  // Foco-specific
  projectId?: string
  taskId?: string
  milestoneId?: string
  syncEnabled?: boolean
  syncDirection?: 'foco_to_external' | 'external_to_foco' | 'bidirectional'
  externalCalendarId?: string
}

export interface UpdateCalendarEventData extends Partial<CreateCalendarEventData> {
  id: string
}

// Calendar view configuration
export interface CalendarViewConfig {
  view: CalendarView
  filter: CalendarFilter
  integrations: string[]
  showExternalEvents: boolean
  showFocoEvents: boolean
  showAllDayEvents: boolean
  showTimedEvents: boolean
}

// Calendar widget data
export interface CalendarWidgetData {
  upcomingEvents: CalendarEvent[]
  todayEvents: CalendarEvent[]
  overdueEvents: CalendarEvent[]
  recentActivity: {
    event: CalendarEvent
    action: 'created' | 'updated' | 'deleted' | 'synced'
    timestamp: string
  }[]
}

// Predefined calendar templates
export interface CalendarTemplate {
  id: string
  name: string
  description: string
  category: 'work' | 'personal' | 'project' | 'team' | 'custom'
  
  // Template configuration
  events: Omit<CreateCalendarEventData, 'start' | 'end'>[]
  recurringPattern?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
    interval: number
    daysOfWeek?: number[]
    dayOfMonth?: number
    monthOfYear?: number
    endDate?: Date
    occurrences?: number
  }
  
  // Metadata
  tags: string[]
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  estimatedTime: number // minutes
  
  // Usage statistics
  usageCount: number
  rating: number
  reviews: number
  
  // Template settings
  isOfficial: boolean
  isFeatured: boolean
  createdBy: string
  createdAt: string
  updatedAt: string
}

// Calendar export/import formats
export type CalendarExportFormat = 'ics' | 'csv' | 'json' | 'pdf'
export type CalendarImportFormat = 'ics' | 'csv' | 'json'

export interface CalendarExportOptions {
  format: CalendarExportFormat
  startDate: Date
  endDate: Date
  includeExternal: boolean
  includeFoco: boolean
  includeAttendees: boolean
  includeReminders: boolean
  timeZone: string
}

export interface CalendarImportOptions {
  format: CalendarImportFormat
  defaultCalendar: string
  conflictResolution: 'skip' | 'overwrite' | 'duplicate'
  syncAfterImport: boolean
  timeZone: string
}

// Calendar API responses
export interface CalendarApiResponse<T> {
  success: boolean
  data: T
  error?: {
    code: string
    message: string
    details?: any
  }
  metadata?: {
    total: number
    page: number
    limit: number
    hasMore: boolean
  }
}

// Calendar webhook events
export interface CalendarWebhookEvent {
  id: string
  type: 'event.created' | 'event.updated' | 'event.deleted' | 'sync.completed' | 'sync.failed'
  integrationId: string
  eventId?: string
  data: any
  timestamp: string
  processed: boolean
}

