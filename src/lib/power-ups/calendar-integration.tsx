'use client'

import { useState, useEffect, useCallback } from 'react'
import { ExtensionManifest } from '@/lib/extensions/extension-api'

// Calendar Integration Power-Up
export const calendarIntegrationManifest: ExtensionManifest = {
  id: 'calendar-integration',
  name: 'Calendar Sync',
  version: '1.0.5',
  description: 'Sync your project deadlines with Google Calendar, Outlook, and other calendar applications.',
  author: 'CalendarSync',
  icon: '/icons/calendar.svg',
  permissions: [
    { type: 'read', resource: 'projects', description: 'Read project data' },
    { type: 'network', resource: 'calendar.google.com', description: 'Access Google Calendar' },
    { type: 'storage', resource: 'calendar-settings', description: 'Store calendar configuration' }
  ],
  entryPoints: [
    { type: 'project', component: 'CalendarSync', position: 'right', priority: 1 },
    { type: 'global', component: 'CalendarWidget', position: 'top', priority: 2 }
  ],
  dependencies: [],
  minVersion: '1.0.0'
}

// Calendar API Types
interface CalendarEvent {
  id: string
  title: string
  description?: string
  start: Date
  end: Date
  allDay: boolean
  location?: string
  attendees?: CalendarAttendee[]
  reminders?: CalendarReminder[]
  colorId?: string
  status: 'confirmed' | 'tentative' | 'cancelled'
}

interface CalendarAttendee {
  email: string
  displayName?: string
  responseStatus: 'accepted' | 'declined' | 'tentative' | 'needsAction'
}

interface CalendarReminder {
  method: 'email' | 'popup'
  minutes: number
}

interface CalendarSettings {
  provider: 'google' | 'outlook' | 'apple'
  accessToken?: string
  refreshToken?: string
  calendarId?: string
  syncEnabled: boolean
  syncDirection: 'import' | 'export' | 'both'
  defaultReminders: CalendarReminder[]
}

// Calendar Service
class CalendarService {
  private settings: CalendarSettings | null = null
  private apiBase = 'https://www.googleapis.com/calendar/v3'

  async loadSettings(api: any): Promise<CalendarSettings | null> {
    try {
      const settings = await api.getStorage('calendar-settings')
      this.settings = settings
      return settings
    } catch (error) {
      api.log(`Failed to load calendar settings: ${error}`, 'error')
      return null
    }
  }

  async saveSettings(api: any, settings: CalendarSettings): Promise<void> {
    try {
      await api.setStorage('calendar-settings', settings)
      this.settings = settings
    } catch (error) {
      api.log(`Failed to save calendar settings: ${error}`, 'error')
      throw error
    }
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    if (!this.settings?.accessToken) {
      throw new Error('Calendar access token not configured')
    }

    const response = await fetch(`${this.apiBase}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.settings.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    })

    if (!response.ok) {
      throw new Error(`Calendar API error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  async getEvents(calendarId: string = 'primary', timeMin?: Date, timeMax?: Date): Promise<CalendarEvent[]> {
    const params = new URLSearchParams()
    if (timeMin) params.append('timeMin', timeMin.toISOString())
    if (timeMax) params.append('timeMax', timeMax.toISOString())
    params.append('singleEvents', 'true')
    params.append('orderBy', 'startTime')

    const response = await this.request(`/calendars/${calendarId}/events?${params}`)
    
    return response.items.map((item: any) => ({
      id: item.id,
      title: item.summary || 'Untitled Event',
      description: item.description,
      start: new Date(item.start.dateTime || item.start.date),
      end: new Date(item.end.dateTime || item.end.date),
      allDay: !item.start.dateTime,
      location: item.location,
      attendees: item.attendees?.map((att: any) => ({
        email: att.email,
        displayName: att.displayName,
        responseStatus: att.responseStatus
      })),
      reminders: item.reminders?.overrides?.map((rem: any) => ({
        method: rem.method,
        minutes: rem.minutes
      })),
      colorId: item.colorId,
      status: item.status
    }))
  }

  async createEvent(calendarId: string = 'primary', event: Omit<CalendarEvent, 'id'>): Promise<CalendarEvent> {
    const response = await this.request(`/calendars/${calendarId}/events`, {
      method: 'POST',
      body: JSON.stringify({
        summary: event.title,
        description: event.description,
        start: {
          dateTime: event.start.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        end: {
          dateTime: event.end.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        location: event.location,
        attendees: event.attendees?.map(att => ({
          email: att.email,
          displayName: att.displayName
        })),
        reminders: {
          overrides: event.reminders?.map(rem => ({
            method: rem.method,
            minutes: rem.minutes
          }))
        },
        colorId: event.colorId
      })
    })

    return {
      id: response.id,
      title: response.summary || 'Untitled Event',
      description: response.description,
      start: new Date(response.start.dateTime || response.start.date),
      end: new Date(response.end.dateTime || response.end.date),
      allDay: !response.start.dateTime,
      location: response.location,
      attendees: response.attendees?.map((att: any) => ({
        email: att.email,
        displayName: att.displayName,
        responseStatus: att.responseStatus
      })),
      reminders: response.reminders?.overrides?.map((rem: any) => ({
        method: rem.method,
        minutes: rem.minutes
      })),
      colorId: response.colorId,
      status: response.status
    }
  }

  async updateEvent(calendarId: string = 'primary', eventId: string, updates: Partial<CalendarEvent>): Promise<CalendarEvent> {
    const response = await this.request(`/calendars/${calendarId}/events/${eventId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        summary: updates.title,
        description: updates.description,
        start: updates.start ? {
          dateTime: updates.start.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        } : undefined,
        end: updates.end ? {
          dateTime: updates.end.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        } : undefined,
        location: updates.location,
        attendees: updates.attendees?.map(att => ({
          email: att.email,
          displayName: att.displayName
        })),
        reminders: updates.reminders ? {
          overrides: updates.reminders.map(rem => ({
            method: rem.method,
            minutes: rem.minutes
          }))
        } : undefined,
        colorId: updates.colorId
      })
    })

    return {
      id: response.id,
      title: response.summary || 'Untitled Event',
      description: response.description,
      start: new Date(response.start.dateTime || response.start.date),
      end: new Date(response.end.dateTime || response.end.date),
      allDay: !response.start.dateTime,
      location: response.location,
      attendees: response.attendees?.map((att: any) => ({
        email: att.email,
        displayName: att.displayName,
        responseStatus: att.responseStatus
      })),
      reminders: response.reminders?.overrides?.map((rem: any) => ({
        method: rem.method,
        minutes: rem.minutes
      })),
      colorId: response.colorId,
      status: response.status
    }
  }

  async deleteEvent(calendarId: string = 'primary', eventId: string): Promise<void> {
    await this.request(`/calendars/${calendarId}/events/${eventId}`, {
      method: 'DELETE'
    })
  }

  async getCalendars(): Promise<Array<{ id: string; name: string; description?: string; color: string }>> {
    const response = await this.request('/users/me/calendarList')
    
    return response.items.map((item: any) => ({
      id: item.id,
      name: item.summary,
      description: item.description,
      color: item.backgroundColor || '#4285f4'
    }))
  }
}

// Calendar Sync Component
export function CalendarSync({ context, api }: { context: any; api: any }) {
  const [settings, setSettings] = useState<CalendarSettings | null>(null)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [calendars, setCalendars] = useState<Array<{ id: string; name: string; description?: string; color: string }>>([])

  const calendarService = new CalendarService()

  // Load settings and events
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const loadedSettings = await calendarService.loadSettings(api)
        setSettings(loadedSettings)
        
        if (loadedSettings?.syncEnabled) {
          const loadedCalendars = await calendarService.getCalendars()
          setCalendars(loadedCalendars)
          
          const loadedEvents = await calendarService.getEvents(
            loadedSettings.calendarId || 'primary',
            new Date(),
            new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Next 30 days
          )
          setEvents(loadedEvents)
        }
      } catch (err) {
        setError(`Failed to load calendar data: ${err}`)
        api.log(`Calendar integration error: ${err}`, 'error')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [api, calendarService])

  // Handle settings update
  const handleSettingsUpdate = async (newSettings: CalendarSettings) => {
    try {
      await calendarService.saveSettings(api, newSettings)
      setSettings(newSettings)
      api.showToast('Calendar settings updated', 'success')
    } catch (err) {
      api.showToast(`Failed to update settings: ${err}`, 'error')
    }
  }

  // Handle event creation
  const handleCreateEvent = async (eventData: Omit<CalendarEvent, 'id'>) => {
    if (!settings) return

    try {
      const event = await calendarService.createEvent(
        settings.calendarId || 'primary',
        eventData
      )
      setEvents(prev => [...prev, event])
      api.showToast('Event created successfully', 'success')
    } catch (err) {
      api.showToast(`Failed to create event: ${err}`, 'error')
    }
  }

  // Handle event update
  const handleUpdateEvent = async (eventId: string, updates: Partial<CalendarEvent>) => {
    if (!settings) return

    try {
      const updatedEvent = await calendarService.updateEvent(
        settings.calendarId || 'primary',
        eventId,
        updates
      )
      setEvents(prev => prev.map(e => e.id === eventId ? updatedEvent : e))
      api.showToast('Event updated successfully', 'success')
    } catch (err) {
      api.showToast(`Failed to update event: ${err}`, 'error')
    }
  }

  // Handle event deletion
  const handleDeleteEvent = async (eventId: string) => {
    if (!settings) return

    try {
      await calendarService.deleteEvent(settings.calendarId || 'primary', eventId)
      setEvents(prev => prev.filter(e => e.id !== eventId))
      api.showToast('Event deleted successfully', 'success')
    } catch (err) {
      api.showToast(`Failed to delete event: ${err}`, 'error')
    }
  }

  if (!settings) {
    return (
      <div className="p-4 border rounded-lg bg-gray-50">
        <div className="text-center">
          <h4 className="font-semibold mb-2">Calendar Integration</h4>
          <p className="text-sm text-gray-600 mb-3">Connect your calendar to sync project deadlines</p>
          <button
            onClick={() => api.showModal('CalendarSettings', { onSave: handleSettingsUpdate })}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Configure Calendar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 border rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold">Calendar Sync</h4>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">{settings.provider}</span>
          <button
            onClick={() => api.showModal('CalendarSettings', { 
              settings, 
              onSave: handleSettingsUpdate 
            })}
            className="text-gray-400 hover:text-gray-600"
          >
            ⚙️
          </button>
        </div>
      </div>

      {loading && (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto" />
        </div>
      )}

      {error && (
        <div className="text-red-600 text-sm mb-3">{error}</div>
      )}

      {!loading && !error && (
        <div className="space-y-3">
          <div className="text-sm text-gray-600">
            {events.length} events in the next 30 days
          </div>
          
          <div className="space-y-2">
            {events.slice(0, 5).map(event => (
              <div key={event.id} className="flex items-center gap-2 p-2 bg-white rounded border">
                <div className="flex-1">
                  <div className="text-sm font-medium">{event.title}</div>
                  <div className="text-xs text-gray-600">
                    {event.start.toLocaleDateString()} {event.start.toLocaleTimeString()}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => api.showModal('EditEventForm', { 
                      event, 
                      onUpdate: (updates: Partial<CalendarEvent>) => handleUpdateEvent(event.id, updates)
                    })}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDeleteEvent(event.id)}
                    className="text-gray-400 hover:text-red-600"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          {events.length > 5 && (
            <div className="text-center">
              <button
                onClick={() => api.showModal('CalendarView', { events })}
                className="text-sm text-blue-600 hover:underline"
              >
                View all {events.length} events
              </button>
            </div>
          )}
        </div>
      )}

      <div className="mt-3 pt-3 border-t">
        <button
          onClick={() => api.showModal('CreateEventForm', { onSubmit: handleCreateEvent })}
          className="w-full px-3 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700"
        >
          Create Event
        </button>
      </div>
    </div>
  )
}

// Calendar Widget Component
export function CalendarWidget({ context, api }: { context: any; api: any }) {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const calendarService = new CalendarService()

  // Load today's events
  useEffect(() => {
    const loadTodayEvents = async () => {
      setLoading(true)
      try {
        const settings = await calendarService.loadSettings(api)
        if (settings?.syncEnabled) {
          const today = new Date()
          const tomorrow = new Date(today)
          tomorrow.setDate(tomorrow.getDate() + 1)
          
          const events = await calendarService.getEvents(
            settings.calendarId || 'primary',
            today,
            tomorrow
          )
          setEvents(events)
        }
      } catch (err) {
        setError(`Failed to load today's events: ${err}`)
        api.log(`Calendar widget error: ${err}`, 'error')
      } finally {
        setLoading(false)
      }
    }
    loadTodayEvents()
  }, [api, calendarService])

  if (loading) {
    return (
      <div className="p-3 border rounded-lg">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mx-auto" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-3 border rounded-lg bg-red-50">
        <div className="text-red-600 text-sm">{error}</div>
      </div>
    )
  }

  return (
    <div className="p-3 border rounded-lg">
      <h5 className="font-semibold mb-2">Today&apos;s Calendar</h5>
      <div className="space-y-1">
        {events.length === 0 ? (
          <p className="text-sm text-gray-600">No events today</p>
        ) : (
          events.map(event => (
            <div key={event.id} className="text-sm">
              <div className="font-medium">{event.title}</div>
              <div className="text-gray-600">
                {event.start.toLocaleTimeString()}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// Export the extension code
export const calendarIntegrationCode = `
import React, { useState, useEffect, useCallback } from 'react'

// Calendar API Types
interface CalendarEvent {
  id: string
  title: string
  description?: string
  start: Date
  end: Date
  allDay: boolean
  location?: string
  attendees?: CalendarAttendee[]
  reminders?: CalendarReminder[]
  colorId?: string
  status: 'confirmed' | 'tentative' | 'cancelled'
}

interface CalendarAttendee {
  email: string
  displayName?: string
  responseStatus: 'accepted' | 'declined' | 'tentative' | 'needsAction'
}

interface CalendarReminder {
  method: 'email' | 'popup'
  minutes: number
}

interface CalendarSettings {
  provider: 'google' | 'outlook' | 'apple'
  accessToken?: string
  refreshToken?: string
  calendarId?: string
  syncEnabled: boolean
  syncDirection: 'import' | 'export' | 'both'
  defaultReminders: CalendarReminder[]
}

// Calendar Service
class CalendarService {
  constructor() {
    this.settings = null
    this.apiBase = 'https://www.googleapis.com/calendar/v3'
  }

  async loadSettings(api) {
    try {
      const settings = await api.getStorage('calendar-settings')
      this.settings = settings
      return settings
    } catch (error) {
      api.log(\`Failed to load calendar settings: \${error}\`, 'error')
      return null
    }
  }

  async saveSettings(api, settings) {
    try {
      await api.setStorage('calendar-settings', settings)
      this.settings = settings
    } catch (error) {
      api.log(\`Failed to save calendar settings: \${error}\`, 'error')
      throw error
    }
  }

  async request(endpoint, options = {}) {
    if (!this.settings?.accessToken) {
      throw new Error('Calendar access token not configured')
    }

    const response = await fetch(\`\${this.apiBase}\${endpoint}\`, {
      ...options,
      headers: {
        'Authorization': \`Bearer \${this.settings.accessToken}\`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    })

    if (!response.ok) {
      throw new Error(\`Calendar API error: \${response.status} \${response.statusText}\`)
    }

    return response.json()
  }

  async getEvents(calendarId = 'primary', timeMin, timeMax) {
    const params = new URLSearchParams()
    if (timeMin) params.append('timeMin', timeMin.toISOString())
    if (timeMax) params.append('timeMax', timeMax.toISOString())
    params.append('singleEvents', 'true')
    params.append('orderBy', 'startTime')

    const response = await this.request(\`/calendars/\${calendarId}/events?\${params}\`)
    
    return response.items.map(item => ({
      id: item.id,
      title: item.summary || 'Untitled Event',
      description: item.description,
      start: new Date(item.start.dateTime || item.start.date),
      end: new Date(item.end.dateTime || item.end.date),
      allDay: !item.start.dateTime,
      location: item.location,
      attendees: item.attendees?.map(att => ({
        email: att.email,
        displayName: att.displayName,
        responseStatus: att.responseStatus
      })),
      reminders: item.reminders?.overrides?.map(rem => ({
        method: rem.method,
        minutes: rem.minutes
      })),
      colorId: item.colorId,
      status: item.status
    }))
  }

  async createEvent(calendarId = 'primary', event) {
    const response = await this.request(\`/calendars/\${calendarId}/events\`, {
      method: 'POST',
      body: JSON.stringify({
        summary: event.title,
        description: event.description,
        start: {
          dateTime: event.start.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        end: {
          dateTime: event.end.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        location: event.location,
        attendees: event.attendees?.map(att => ({
          email: att.email,
          displayName: att.displayName
        })),
        reminders: {
          overrides: event.reminders?.map(rem => ({
            method: rem.method,
            minutes: rem.minutes
          }))
        },
        colorId: event.colorId
      })
    })

    return {
      id: response.id,
      title: response.summary || 'Untitled Event',
      description: response.description,
      start: new Date(response.start.dateTime || response.start.date),
      end: new Date(response.end.dateTime || response.end.date),
      allDay: !response.start.dateTime,
      location: response.location,
      attendees: response.attendees?.map(att => ({
        email: att.email,
        displayName: att.displayName,
        responseStatus: att.responseStatus
      })),
      reminders: response.reminders?.overrides?.map(rem => ({
        method: rem.method,
        minutes: rem.minutes
      })),
      colorId: response.colorId,
      status: response.status
    }
  }
}

// Calendar Sync Component
function CalendarSync({ context, api }) {
  const [settings, setSettings] = useState(null)
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const calendarService = new CalendarService()

  // Load settings and events
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const loadedSettings = await calendarService.loadSettings(api)
        setSettings(loadedSettings)
        
        if (loadedSettings?.syncEnabled) {
          const loadedEvents = await calendarService.getEvents(
            loadedSettings.calendarId || 'primary',
            new Date(),
            new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Next 30 days
          )
          setEvents(loadedEvents)
        }
      } catch (err) {
        setError(\`Failed to load calendar data: \${err}\`)
        api.log(\`Calendar integration error: \${err}\`, 'error')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  if (!settings) {
    return (
      <div className="p-4 border rounded-lg bg-gray-50">
        <div className="text-center">
          <h4 className="font-semibold mb-2">Calendar Integration</h4>
          <p className="text-sm text-gray-600 mb-3">Connect your calendar to sync project deadlines</p>
          <button
            onClick={() => api.showModal('CalendarSettings', { onSave: setSettings })}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Configure Calendar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 border rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold">Calendar Sync</h4>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">{settings.provider}</span>
          <button
            onClick={() => api.showModal('CalendarSettings', { 
              settings, 
              onSave: setSettings 
            })}
            className="text-gray-400 hover:text-gray-600"
          >
            ⚙️
          </button>
        </div>
      </div>

      {loading && (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto" />
        </div>
      )}

      {error && (
        <div className="text-red-600 text-sm mb-3">{error}</div>
      )}

      {!loading && !error && (
        <div className="space-y-3">
          <div className="text-sm text-gray-600">
            {events.length} events in the next 30 days
          </div>
          
          <div className="space-y-2">
            {events.slice(0, 5).map(event => (
              <div key={event.id} className="flex items-center gap-2 p-2 bg-white rounded border">
                <div className="flex-1">
                  <div className="text-sm font-medium">{event.title}</div>
                  <div className="text-xs text-gray-600">
                    {event.start.toLocaleDateString()} {event.start.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Calendar Widget Component
function CalendarWidget({ context, api }) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const calendarService = new CalendarService()

  // Load today's events
  useEffect(() => {
    const loadTodayEvents = async () => {
      setLoading(true)
      try {
        const settings = await calendarService.loadSettings(api)
        if (settings?.syncEnabled) {
          const today = new Date()
          const tomorrow = new Date(today)
          tomorrow.setDate(tomorrow.getDate() + 1)
          
          const events = await calendarService.getEvents(
            settings.calendarId || 'primary',
            today,
            tomorrow
          )
          setEvents(events)
        }
      } catch (err) {
        setError(\`Failed to load today's events: \${err}\`)
        api.log(\`Calendar widget error: \${err}\`, 'error')
      } finally {
        setLoading(false)
      }
    }
    loadTodayEvents()
  }, [])

  if (loading) {
    return (
      <div className="p-3 border rounded-lg">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mx-auto" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-3 border rounded-lg bg-red-50">
        <div className="text-red-600 text-sm">{error}</div>
      </div>
    )
  }

  return (
    <div className="p-3 border rounded-lg">
      <h5 className="font-semibold mb-2">Today&apos;s Calendar</h5>
      <div className="space-y-1">
        {events.length === 0 ? (
          <p className="text-sm text-gray-600">No events today</p>
        ) : (
          events.map(event => (
            <div key={event.id} className="text-sm">
              <div className="font-medium">{event.title}</div>
              <div className="text-gray-600">
                {event.start.toLocaleTimeString()}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// Export components
export default {
  CalendarSync,
  CalendarWidget
}
`
