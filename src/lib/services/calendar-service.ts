import { supabase } from '@/lib/supabase/client'
import { 
  CalendarEvent, 
  CalendarIntegration, 
  ExternalCalendar, 
  CalendarView, 
  CalendarFilter,
  CreateCalendarEventData,
  UpdateCalendarEventData,
  CalendarSyncJob,
  CalendarAnalytics,
  CalendarTemplate,
  CalendarExportOptions,
  CalendarImportOptions,
  CalendarApiResponse
} from '@/lib/models/calendar'

export class CalendarService {
  // Event Management
  static async createEvent(eventData: CreateCalendarEventData, userId: string): Promise<CalendarEvent> {
    const { data, error } = await supabase
      .from('calendar_events' as any)
      .insert({
        ...eventData,
        owner_id: userId,
        source: 'foco',
        sync_enabled: eventData.syncEnabled ?? true,
        sync_direction: eventData.syncDirection ?? 'bidirectional'
      })
      .select()
      .single()

    if (error) throw error
    return data as any
  }

  static async getEvents(
    userId: string,
    startDate: Date,
    endDate: Date,
    filter?: CalendarFilter
  ): Promise<CalendarEvent[]> {
    let query = supabase
      .from('calendar_events' as any)
      .select('*')
      .gte('start', startDate.toISOString())
      .lte('end', endDate.toISOString())
      .or(`owner_id.eq.${userId},attendees.cs.[{"email":"${userId}"}]`)

    if (filter) {
      if (filter.projects?.length) {
        query = query.in('project_id', filter.projects)
      }
      if (filter.tasks?.length) {
        query = query.in('task_id', filter.tasks)
      }
      if (filter.milestones?.length) {
        query = query.in('milestone_id', filter.milestones)
      }
      if (filter.sources?.length) {
        query = query.in('source', filter.sources)
      }
    }

    const { data, error } = await query.order('start', { ascending: true })

    if (error) throw error
    return data as any || []
  }

  static async getEvent(eventId: string): Promise<CalendarEvent | null> {
    const { data, error } = await supabase
      .from('calendar_events' as any)
      .select('*')
      .eq('id', eventId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }

    return data as any
  }

  static async updateEvent(eventId: string, updates: UpdateCalendarEventData): Promise<CalendarEvent> {
    const { data, error } = await supabase
      .from('calendar_events' as any)
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', eventId)
      .select()
      .single()

    if (error) throw error
    return data as any
  }

  static async deleteEvent(eventId: string): Promise<void> {
    const { error } = await supabase
      .from('calendar_events' as any)
      .delete()
      .eq('id', eventId)

    if (error) throw error
  }

  // Integration Management
  static async createIntegration(integration: Omit<CalendarIntegration, 'id' | 'created_at' | 'updated_at'>): Promise<CalendarIntegration> {
    const { data, error } = await supabase
      .from('calendar_integrations' as any)
      .insert(integration)
      .select()
      .single()

    if (error) throw error
    return data as any
  }

  static async getIntegrations(userId: string): Promise<CalendarIntegration[]> {
    const { data, error } = await supabase
      .from('calendar_integrations' as any)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as any || []
  }

  static async getIntegration(integrationId: string): Promise<CalendarIntegration | null> {
    const { data, error } = await supabase
      .from('calendar_integrations' as any)
      .select('*')
      .eq('id', integrationId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }

    return data as any
  }

  static async updateIntegration(integrationId: string, updates: Partial<CalendarIntegration>): Promise<CalendarIntegration> {
    const { data, error } = await supabase
      .from('calendar_integrations' as any)
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', integrationId)
      .select()
      .single()

    if (error) throw error
    return data as any
  }

  static async deleteIntegration(integrationId: string): Promise<void> {
    const { error } = await supabase
      .from('calendar_integrations' as any)
      .delete()
      .eq('id', integrationId)

    if (error) throw error
  }

  // External Calendar Management
  static async getExternalCalendars(integrationId: string): Promise<ExternalCalendar[]> {
    // This would typically call the external calendar API
    // For now, return mock data
    return [
      {
        id: 'primary',
        name: 'Primary Calendar',
        description: 'Main calendar',
        color: '#4285f4',
        accessRole: 'owner',
        selected: true,
        primary: true,
        timeZone: 'UTC',
        backgroundColor: '#4285f4',
        foregroundColor: '#ffffff'
      }
    ]
  }

  static async updateExternalCalendarSelection(integrationId: string, calendarIds: string[]): Promise<void> {
    await this.updateIntegration(integrationId, {
      selectedCalendars: calendarIds
    })
  }

  // Sync Management
  static async startSync(integrationId: string, type: 'full' | 'incremental' | 'manual' = 'incremental'): Promise<CalendarSyncJob> {
    const integration = await this.getIntegration(integrationId)
    if (!integration) {
      throw new Error('Integration not found')
    }

    const syncJob: Omit<CalendarSyncJob, 'id'> = {
      integrationId: integrationId,
      userId: integration.userId,
      status: 'pending',
      type,
      totalEvents: 0,
      processedEvents: 0,
      createdEvents: 0,
      updatedEvents: 0,
      deletedEvents: 0,
      errorEvents: 0,
      startedAt: new Date().toISOString(),
      errors: [],
      retryCount: 0,
      maxRetries: 3
    }

    const { data, error } = await supabase
      .from('calendar_sync_jobs' as any)
      .insert(syncJob)
      .select()
      .single()

    if (error) throw error

    const syncJobData = data as any

    // Start the actual sync process
    this.executeSync(syncJobData.id)

    return syncJobData
  }

  private static async executeSync(jobId: string): Promise<void> {
    try {
      // Update job status to running
      await supabase
        .from('calendar_sync_jobs' as any)
        .update({ status: 'running' })
        .eq('id', jobId)

      // Get job details
      const { data: job, error: jobError } = await supabase
        .from('calendar_sync_jobs' as any)
        .select('*')
        .eq('id', jobId)
        .single()

      if (jobError || !job) {
        throw new Error('Sync job not found')
      }

      const jobData = job as any
      const integration = await this.getIntegration(jobData.integration_id)
      if (!integration) {
        throw new Error('Integration not found')
      }

      // Perform the actual sync based on provider
      await this.performProviderSync(integration, jobData)

      // Mark job as completed
      await supabase
        .from('calendar_sync_jobs' as any)
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', jobId)

      // Update integration last sync time
      await this.updateIntegration(integration.id, {
        lastSyncAt: new Date().toISOString()
      })

    } catch (error: any) {
      console.error('Sync execution failed:', error)
      
      // Mark job as failed
      await supabase
        .from('calendar_sync_jobs' as any)
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          errors: [{ 
            id: `error_${Date.now()}`,
            job_id: jobId,
            error_type: 'unknown',
            error_message: error.message,
            timestamp: new Date().toISOString(),
            resolved: false
          }]
        })
        .eq('id', jobId)
    }
  }

  private static async performProviderSync(integration: CalendarIntegration, job: CalendarSyncJob): Promise<void> {
    switch (integration.provider) {
      case 'google':
        await this.syncGoogleCalendar(integration, job)
        break
      case 'outlook':
        await this.syncOutlookCalendar(integration, job)
        break
      case 'apple':
        await this.syncAppleCalendar(integration, job)
        break
      case 'caldav':
        await this.syncCalDAVCalendar(integration, job)
        break
      default:
        throw new Error(`Unsupported provider: ${integration.provider}`)
    }
  }

  private static async syncGoogleCalendar(integration: CalendarIntegration, job: CalendarSyncJob): Promise<void> {
    // Google Calendar API integration
    // This would use the Google Calendar API to sync events
    console.log('Syncing Google Calendar:', integration.providerId)
    
    // Mock sync process
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Update job progress
    await supabase
      .from('calendar_sync_jobs' as any)
      .update({
        total_events: 10,
        processed_events: 10,
        created_events: 5,
        updated_events: 3,
        deleted_events: 2
      })
      .eq('id', job.id)
  }

  private static async syncOutlookCalendar(integration: CalendarIntegration, job: CalendarSyncJob): Promise<void> {
    // Outlook Calendar API integration
    console.log('Syncing Outlook Calendar:', integration.providerId)
    
    // Mock sync process
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Update job progress
    await supabase
      .from('calendar_sync_jobs' as any)
      .update({
        total_events: 8,
        processed_events: 8,
        created_events: 4,
        updated_events: 2,
        deleted_events: 2
      })
      .eq('id', job.id)
  }

  private static async syncAppleCalendar(integration: CalendarIntegration, job: CalendarSyncJob): Promise<void> {
    // Apple Calendar integration
    console.log('Syncing Apple Calendar:', integration.providerId)
    
    // Mock sync process
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Update job progress
    await supabase
      .from('calendar_sync_jobs' as any)
      .update({
        total_events: 6,
        processed_events: 6,
        created_events: 3,
        updated_events: 2,
        deleted_events: 1
      })
      .eq('id', job.id)
  }

  private static async syncCalDAVCalendar(integration: CalendarIntegration, job: CalendarSyncJob): Promise<void> {
    // CalDAV integration
    console.log('Syncing CalDAV Calendar:', integration.providerId)
    
    // Mock sync process
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Update job progress
    await supabase
      .from('calendar_sync_jobs' as any)
      .update({
        total_events: 4,
        processed_events: 4,
        created_events: 2,
        updated_events: 1,
        deleted_events: 1
      })
      .eq('id', job.id)
  }

  // Analytics
  static async getAnalytics(userId: string, period: 'day' | 'week' | 'month' | 'year' = 'month'): Promise<CalendarAnalytics> {
    const now = new Date()
    const startDate = this.getPeriodStartDate(now, period)
    const endDate = this.getPeriodEndDate(now, period)

    // Get event statistics
    const events = await this.getEvents(userId, startDate, endDate)
    
    const totalEvents = events.length
    const focoEvents = events.filter(e => e.source === 'foco').length
    const externalEvents = events.filter(e => e.source === 'external').length
    const allDayEvents = events.filter(e => e.allDay).length
    const timedEvents = events.filter(e => !e.allDay).length

    // Get sync statistics
    const { data: syncJobs, error: syncError } = await supabase
      .from('calendar_sync_jobs' as any)
      .select('*')
      .eq('user_id', userId)
      .gte('started_at', startDate.toISOString())
      .lte('started_at', endDate.toISOString())

    if (syncError) throw syncError

    const syncJobsData = (syncJobs || []) as any[]
    const syncOperations = syncJobsData.length
    const successfulSyncs = syncJobsData.filter((job: any) => job.status === 'completed').length
    const failedSyncs = syncJobsData.filter((job: any) => job.status === 'failed').length
    const syncSuccessRate = syncOperations > 0 ? (successfulSyncs / syncOperations) * 100 : 0

    // Get integration statistics
    const integrations = await this.getIntegrations(userId)
    const activeIntegrations = integrations.filter(i => i.syncEnabled).length
    const totalIntegrations = integrations.length
    const mostUsedProvider = this.getMostUsedProvider(integrations)

    // Calculate performance metrics
    const completedJobs = syncJobsData.filter((job: any) => job.status === 'completed')
    const syncTimes = completedJobs.map(job => {
      const start = new Date(job.started_at)
      const end = new Date(job.completed_at || job.started_at)
      return end.getTime() - start.getTime()
    })

    const averageSyncTime = syncTimes.length > 0 ? syncTimes.reduce((a, b) => a + b, 0) / syncTimes.length : 0
    const fastestSyncTime = syncTimes.length > 0 ? Math.min(...syncTimes) : 0
    const slowestSyncTime = syncTimes.length > 0 ? Math.max(...syncTimes) : 0

    return {
      userId,
      period,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      totalEvents,
      focoEvents,
      externalEvents,
      allDayEvents,
      timedEvents,
      syncOperations,
      successfulSyncs,
      failedSyncs,
      syncSuccessRate,
      mostActiveDay: this.getMostActiveDay(events),
      mostActiveHour: this.getMostActiveHour(events),
      averageEventsPerDay: totalEvents / this.getDaysInPeriod(startDate, endDate),
      longestEventDuration: this.getLongestEventDuration(events),
      activeIntegrations,
      totalIntegrations,
      mostUsedProvider,
      averageSyncTime,
      fastestSyncTime,
      slowestSyncTime
    }
  }

  private static getPeriodStartDate(date: Date, period: string): Date {
    const start = new Date(date)
    switch (period) {
      case 'day':
        start.setHours(0, 0, 0, 0)
        break
      case 'week':
        start.setDate(date.getDate() - date.getDay())
        start.setHours(0, 0, 0, 0)
        break
      case 'month':
        start.setDate(1)
        start.setHours(0, 0, 0, 0)
        break
      case 'year':
        start.setMonth(0, 1)
        start.setHours(0, 0, 0, 0)
        break
    }
    return start
  }

  private static getPeriodEndDate(date: Date, period: string): Date {
    const end = new Date(date)
    switch (period) {
      case 'day':
        end.setHours(23, 59, 59, 999)
        break
      case 'week':
        end.setDate(date.getDate() + (6 - date.getDay()))
        end.setHours(23, 59, 59, 999)
        break
      case 'month':
        end.setMonth(date.getMonth() + 1, 0)
        end.setHours(23, 59, 59, 999)
        break
      case 'year':
        end.setMonth(11, 31)
        end.setHours(23, 59, 59, 999)
        break
    }
    return end
  }

  private static getDaysInPeriod(start: Date, end: Date): number {
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  }

  private static getMostUsedProvider(integrations: CalendarIntegration[]): string {
    const providerCounts = integrations.reduce((acc, integration) => {
      acc[integration.provider] = (acc[integration.provider] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return Object.entries(providerCounts).reduce((a, b) => 
      providerCounts[a[0]] > providerCounts[b[0]] ? a : b
    )[0] || 'none'
  }

  private static getMostActiveDay(events: CalendarEvent[]): string {
    const dayCounts = events.reduce((acc, event) => {
      const day = new Date(event.start).toLocaleDateString()
      acc[day] = (acc[day] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return Object.entries(dayCounts).reduce((a, b) => 
      dayCounts[a[0]] > dayCounts[b[0]] ? a : b
    )[0] || 'none'
  }

  private static getMostActiveHour(events: CalendarEvent[]): number {
    const hourCounts = events.reduce((acc, event) => {
      const hour = new Date(event.start).getHours()
      acc[hour] = (acc[hour] || 0) + 1
      return acc
    }, {} as Record<number, number>)

    const entries = Object.entries(hourCounts)
    if (entries.length === 0) return 0

    const mostActiveEntry = entries.reduce((a, b) =>
      hourCounts[Number(a[0])] > hourCounts[Number(b[0])] ? a : b
    )

    return Number(mostActiveEntry[0])
  }

  private static getLongestEventDuration(events: CalendarEvent[]): number {
    if (events.length === 0) return 0

    return Math.max(...events.map(event => {
      const start = new Date(event.start)
      const end = new Date(event.end)
      return end.getTime() - start.getTime()
    }))
  }

  // Export/Import
  static async exportEvents(userId: string, options: CalendarExportOptions): Promise<string> {
    const events = await this.getEvents(userId, options.startDate, options.endDate)
    
    let filteredEvents = events
    if (!options.includeExternal) {
      filteredEvents = filteredEvents.filter(e => e.source === 'foco')
    }
    if (!options.includeFoco) {
      filteredEvents = filteredEvents.filter(e => e.source === 'external')
    }

    switch (options.format) {
      case 'ics':
        return this.generateICS(filteredEvents, options)
      case 'csv':
        return this.generateCSV(filteredEvents, options)
      case 'json':
        return JSON.stringify(filteredEvents, null, 2)
      case 'pdf':
        return this.generatePDF(filteredEvents, options)
      default:
        throw new Error(`Unsupported export format: ${options.format}`)
    }
  }

  private static generateICS(events: CalendarEvent[], options: CalendarExportOptions): string {
    let ics = 'BEGIN:VCALENDAR\n'
    ics += 'VERSION:2.0\n'
    ics += 'PRODID:-//Foco//Calendar//EN\n'
    ics += 'CALSCALE:GREGORIAN\n'
    ics += 'METHOD:PUBLISH\n'

    events.forEach(event => {
      ics += 'BEGIN:VEVENT\n'
      ics += `UID:${event.id}@foco.mx\n`
      ics += `DTSTART:${this.formatICSDate(event.start)}\n`
      ics += `DTEND:${this.formatICSDate(event.end)}\n`
      ics += `SUMMARY:${event.title}\n`
      if (event.description) {
        ics += `DESCRIPTION:${event.description}\n`
      }
      if (event.location) {
        ics += `LOCATION:${event.location}\n`
      }
      ics += `STATUS:${event.status.toUpperCase()}\n`
      ics += 'END:VEVENT\n'
    })

    ics += 'END:VCALENDAR\n'
    return ics
  }

  private static generateCSV(events: CalendarEvent[], options: CalendarExportOptions): string {
    const headers = ['Title', 'Start', 'End', 'All Day', 'Description', 'Location', 'Status']
    const rows = events.map(event => [
      event.title,
      event.start.toISOString(),
      event.end.toISOString(),
      event.allDay ? 'Yes' : 'No',
      event.description || '',
      event.location || '',
      event.status
    ])

    return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
  }

  private static generatePDF(events: CalendarEvent[], options: CalendarExportOptions): string {
    // This would generate a PDF using a library like jsPDF
    // For now, return a placeholder
    return 'PDF generation not implemented'
  }

  private static formatICSDate(date: Date): string {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  }

  // Templates
  static async getTemplates(category?: string): Promise<CalendarTemplate[]> {
    // Return predefined templates
    const templates: CalendarTemplate[] = [
      {
        id: 'daily-standup',
        name: 'Daily Standup',
        description: 'Daily team standup meeting',
        category: 'work',
        events: [{
          title: 'Daily Standup',
          description: 'Team standup meeting',
          allDay: false,
          location: 'Conference Room A',
          status: 'confirmed',
          visibility: 'private'
        }],
        recurringPattern: {
          frequency: 'daily',
          interval: 1,
          daysOfWeek: [1, 2, 3, 4, 5], // Monday to Friday
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
        },
        tags: ['meeting', 'standup', 'daily'],
        difficulty: 'beginner',
        estimatedTime: 15,
        usageCount: 0,
        rating: 0,
        reviews: 0,
        isOfficial: true,
        isFeatured: true,
        createdBy: 'system',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]

    if (category) {
      return templates.filter(template => template.category === category)
    }

    return templates
  }

  static async createEventFromTemplate(templateId: string, userId: string, startDate: Date): Promise<CalendarEvent> {
    const templates = await this.getTemplates()
    const template = templates.find(t => t.id === templateId)
    
    if (!template) {
      throw new Error('Template not found')
    }

    const eventData = template.events[0]
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000) // 1 hour duration

    return this.createEvent({
      ...eventData,
      start: startDate,
      end: endDate
    }, userId)
  }
}

