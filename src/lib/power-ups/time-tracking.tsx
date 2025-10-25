'use client'

import { useState, useEffect, useCallback } from 'react'
import { ExtensionManifest } from '@/lib/extensions/extension-api'

// Time Tracking Power-Up
export const timeTrackingManifest: ExtensionManifest = {
  id: 'time-tracking',
  name: 'Time Tracking Pro',
  version: '2.1.0',
  description: 'Advanced time tracking with detailed reports, team analytics, and integration with popular tools.',
  author: 'TimeTrack Inc',
  icon: '/icons/time.svg',
  permissions: [
    { type: 'read', resource: 'tasks', description: 'Read task data' },
    { type: 'write', resource: 'tasks', description: 'Update task data' },
    { type: 'storage', resource: 'time-data', description: 'Store time tracking data' },
    { type: 'notifications', resource: 'time-alerts', description: 'Send time tracking notifications' }
  ],
  entryPoints: [
    { type: 'card', component: 'TimeTracker', position: 'bottom', priority: 1 },
    { type: 'project', component: 'TimeReports', position: 'right', priority: 2 }
  ],
  dependencies: [],
  minVersion: '1.0.0'
}

// Time Tracking Types
interface TimeEntry {
  id: string
  taskId: string
  projectId: string
  userId: string
  startTime: Date
  endTime?: Date
  duration: number // in milliseconds
  description?: string
  tags: string[]
  billable: boolean
  hourlyRate?: number
  createdAt: Date
  updatedAt: Date
}

interface TimeTrackingSettings {
  defaultHourlyRate: number
  autoStart: boolean
  reminders: {
    enabled: boolean
    interval: number // in minutes
    message: string
  }
  reports: {
    includeWeekends: boolean
    defaultPeriod: 'day' | 'week' | 'month' | 'quarter' | 'year'
    currency: string
  }
  integrations: {
    harvest: boolean
    toggl: boolean
    clockify: boolean
  }
}

interface TimeReport {
  period: string
  totalTime: number
  billableTime: number
  totalEarnings: number
  entries: TimeEntry[]
  breakdown: {
    byProject: Array<{ projectId: string; projectName: string; time: number; earnings: number }>
    byTask: Array<{ taskId: string; taskName: string; time: number; earnings: number }>
    byDay: Array<{ date: string; time: number; earnings: number }>
  }
}

// Time Tracking Service
class TimeTrackingService {
  private settings: TimeTrackingSettings | null = null
  private currentEntry: TimeEntry | null = null
  private timer: NodeJS.Timeout | null = null

  async loadSettings(api: any): Promise<TimeTrackingSettings | null> {
    try {
      const settings = await api.getStorage('time-tracking-settings')
      this.settings = settings
      return settings
    } catch (error) {
      api.log(`Failed to load time tracking settings: ${error}`, 'error')
      return null
    }
  }

  async saveSettings(api: any, settings: TimeTrackingSettings): Promise<void> {
    try {
      await api.setStorage('time-tracking-settings', settings)
      this.settings = settings
    } catch (error) {
      api.log(`Failed to save time tracking settings: ${error}`, 'error')
      throw error
    }
  }

  async getTimeEntries(api: any, filters?: {
    taskId?: string
    projectId?: string
    userId?: string
    startDate?: Date
    endDate?: Date
  }): Promise<TimeEntry[]> {
    try {
      const entries = await api.getStorage('time-entries') || []
      
      if (!filters) return entries
      
      return entries.filter((entry: TimeEntry) => {
        if (filters.taskId && entry.taskId !== filters.taskId) return false
        if (filters.projectId && entry.projectId !== filters.projectId) return false
        if (filters.userId && entry.userId !== filters.userId) return false
        if (filters.startDate && entry.startTime < filters.startDate) return false
        if (filters.endDate && entry.startTime > filters.endDate) return false
        return true
      })
    } catch (error) {
      api.log(`Failed to get time entries: ${error}`, 'error')
      return []
    }
  }

  async saveTimeEntry(api: any, entry: TimeEntry): Promise<void> {
    try {
      const entries = await this.getTimeEntries(api)
      const existingIndex = entries.findIndex(e => e.id === entry.id)
      
      if (existingIndex >= 0) {
        entries[existingIndex] = entry
      } else {
        entries.push(entry)
      }
      
      await api.setStorage('time-entries', entries)
    } catch (error) {
      api.log(`Failed to save time entry: ${error}`, 'error')
      throw error
    }
  }

  async deleteTimeEntry(api: any, entryId: string): Promise<void> {
    try {
      const entries = await this.getTimeEntries(api)
      const filteredEntries = entries.filter(e => e.id !== entryId)
      await api.setStorage('time-entries', filteredEntries)
    } catch (error) {
      api.log(`Failed to delete time entry: ${error}`, 'error')
      throw error
    }
  }

  async startTracking(api: any, taskId: string, projectId: string, userId: string, description?: string): Promise<TimeEntry> {
    if (this.currentEntry) {
      throw new Error('Another time entry is already running')
    }

    const entry: TimeEntry = {
      id: `time-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      taskId,
      projectId,
      userId,
      startTime: new Date(),
      duration: 0,
      description,
      tags: [],
      billable: true,
      hourlyRate: this.settings?.defaultHourlyRate,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    this.currentEntry = entry
    await this.saveTimeEntry(api, entry)

    // Start timer
    this.timer = setInterval(() => {
      if (this.currentEntry) {
        this.currentEntry.duration = Date.now() - this.currentEntry.startTime.getTime()
        this.currentEntry.updatedAt = new Date()
        this.saveTimeEntry(api, this.currentEntry)
      }
    }, 1000) // Update every second

    return entry
  }

  async stopTracking(api: any): Promise<TimeEntry | null> {
    if (!this.currentEntry) {
      return null
    }

    const entry = this.currentEntry
    entry.endTime = new Date()
    entry.duration = entry.endTime.getTime() - entry.startTime.getTime()
    entry.updatedAt = new Date()

    await this.saveTimeEntry(api, entry)

    // Clear timer
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }

    this.currentEntry = null
    return entry
  }

  getCurrentEntry(): TimeEntry | null {
    return this.currentEntry
  }

  isTracking(): boolean {
    return this.currentEntry !== null
  }

  async generateReport(api: any, period: {
    start: Date
    end: Date
  }, userId?: string): Promise<TimeReport> {
    const entries = await this.getTimeEntries(api, {
      userId,
      startDate: period.start,
      endDate: period.end
    })

    const totalTime = entries.reduce((sum, entry) => sum + entry.duration, 0)
    const billableEntries = entries.filter(entry => entry.billable)
    const billableTime = billableEntries.reduce((sum, entry) => sum + entry.duration, 0)
    const totalEarnings = billableEntries.reduce((sum, entry) => {
      const hours = entry.duration / (1000 * 60 * 60)
      return sum + (hours * (entry.hourlyRate || 0))
    }, 0)

    // Group by project
    const projectBreakdown = new Map<string, { projectId: string; projectName: string; time: number; earnings: number }>()
    entries.forEach(entry => {
      const existing = projectBreakdown.get(entry.projectId) || {
        projectId: entry.projectId,
        projectName: `Project ${entry.projectId}`, // TODO: Get actual project name
        time: 0,
        earnings: 0
      }
      existing.time += entry.duration
      if (entry.billable) {
        const hours = entry.duration / (1000 * 60 * 60)
        existing.earnings += hours * (entry.hourlyRate || 0)
      }
      projectBreakdown.set(entry.projectId, existing)
    })

    // Group by task
    const taskBreakdown = new Map<string, { taskId: string; taskName: string; time: number; earnings: number }>()
    entries.forEach(entry => {
      const existing = taskBreakdown.get(entry.taskId) || {
        taskId: entry.taskId,
        taskName: `Task ${entry.taskId}`, // TODO: Get actual task name
        time: 0,
        earnings: 0
      }
      existing.time += entry.duration
      if (entry.billable) {
        const hours = entry.duration / (1000 * 60 * 60)
        existing.earnings += hours * (entry.hourlyRate || 0)
      }
      taskBreakdown.set(entry.taskId, existing)
    })

    // Group by day
    const dayBreakdown = new Map<string, { date: string; time: number; earnings: number }>()
    entries.forEach(entry => {
      const date = entry.startTime.toISOString().split('T')[0]
      const existing = dayBreakdown.get(date) || {
        date,
        time: 0,
        earnings: 0
      }
      existing.time += entry.duration
      if (entry.billable) {
        const hours = entry.duration / (1000 * 60 * 60)
        existing.earnings += hours * (entry.hourlyRate || 0)
      }
      dayBreakdown.set(date, existing)
    })

    return {
      period: `${period.start.toISOString().split('T')[0]} to ${period.end.toISOString().split('T')[0]}`,
      totalTime,
      billableTime,
      totalEarnings,
      entries,
      breakdown: {
        byProject: Array.from(projectBreakdown.values()),
        byTask: Array.from(taskBreakdown.values()),
        byDay: Array.from(dayBreakdown.values()).sort((a, b) => a.date.localeCompare(b.date))
      }
    }
  }

  formatDuration(milliseconds: number): string {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60))
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000)
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    } else {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`
    }
  }

  formatEarnings(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency
    }).format(amount)
  }
}

// Time Tracker Component
export function TimeTracker({ context, api }: { context: any; api: any }) {
  const [settings, setSettings] = useState<TimeTrackingSettings | null>(null)
  const [currentEntry, setCurrentEntry] = useState<TimeEntry | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [duration, setDuration] = useState(0)

  // Load settings and current entry
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const loadedSettings = await timeServiceInstance.loadSettings(api)
        setSettings(loadedSettings)

        const current = timeServiceInstance.getCurrentEntry()
        setCurrentEntry(current)

        if (current) {
          // Start duration update timer
          const timer = setInterval(() => {
            const now = Date.now()
            const elapsed = now - current.startTime.getTime()
            setDuration(elapsed)
          }, 1000)

          return () => clearInterval(timer)
        }
      } catch (err) {
        setError(`Failed to load time tracking data: ${err}`)
        api.log(`Time tracking error: ${err}`, 'error')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [api])

  // Handle start tracking
  const handleStart = async () => {
    if (!context.taskId || !context.projectId || !context.userId) {
      api.showToast('Missing required context for time tracking', 'error')
      return
    }

    try {
      const entry = await timeServiceInstance.startTracking(
        api,
        context.taskId,
        context.projectId,
        context.userId,
        'Time tracking started'
      )
      setCurrentEntry(entry)
      setDuration(0)
      api.showToast('Time tracking started', 'success')
    } catch (err) {
      api.showToast(`Failed to start tracking: ${err}`, 'error')
    }
  }

  // Handle stop tracking
  const handleStop = async () => {
    try {
      const entry = await timeServiceInstance.stopTracking(api)
      if (entry) {
        setCurrentEntry(null)
        setDuration(0)
        api.showToast(`Time tracking stopped. Duration: ${timeServiceInstance.formatDuration(entry.duration)}`, 'success')
      }
    } catch (err) {
      api.showToast(`Failed to stop tracking: ${err}`, 'error')
    }
  }

  // Handle settings update
  const handleSettingsUpdate = async (newSettings: TimeTrackingSettings) => {
    try {
      await timeServiceInstance.saveSettings(api, newSettings)
      setSettings(newSettings)
      api.showToast('Time tracking settings updated', 'success')
    } catch (err) {
      api.showToast(`Failed to update settings: ${err}`, 'error')
    }
  }

  if (loading) {
    return (
      <div className="p-4 border rounded-lg">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto" />
      </div>
    )
  }

  return (
    <div className="p-4 border rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold">Time Tracking</h4>
        <button
          onClick={() => api.showModal('TimeTrackingSettings', { 
            settings, 
            onSave: handleSettingsUpdate 
          })}
          className="text-gray-400 hover:text-gray-600"
        >
          ⚙️
        </button>
      </div>

      {error && (
        <div className="text-red-600 text-sm mb-3">{error}</div>
      )}

      <div className="space-y-3">
        {/* Current Timer */}
        {currentEntry ? (
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-mono font-bold text-green-600 mb-2">
              {timeService.formatDuration(duration)}
            </div>
            <div className="text-sm text-gray-600 mb-3">
              Started at {currentEntry.startTime.toLocaleTimeString()}
            </div>
            <button
              onClick={handleStop}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Stop Tracking
            </button>
          </div>
        ) : (
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-lg font-semibold text-gray-600 mb-3">
              Ready to track time
            </div>
            <button
              onClick={handleStart}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Start Tracking
            </button>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="p-2 bg-blue-50 rounded">
            <div className="font-semibold text-blue-600">Today</div>
            <div className="text-gray-600">0h 0m</div>
          </div>
          <div className="p-2 bg-purple-50 rounded">
            <div className="font-semibold text-purple-600">This Week</div>
            <div className="text-gray-600">0h 0m</div>
          </div>
        </div>

        {/* Recent Entries */}
        <div className="space-y-2">
          <h5 className="font-medium text-sm">Recent Entries</h5>
          <div className="text-sm text-gray-600 text-center py-2">
            No recent entries
          </div>
        </div>
      </div>
    </div>
  )
}

// Singleton instance for time tracking service
const timeServiceInstance = new TimeTrackingService()

// Time Reports Component
export function TimeReports({ context, api }: { context: any; api: any }) {
  const [report, setReport] = useState<TimeReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState<{
    start: Date
    end: Date
  }>({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
    end: new Date()
  })

  // Load report
  const loadReport = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const reportData = await timeServiceInstance.generateReport(api, period, context.userId)
      setReport(reportData)
    } catch (err) {
      setError(`Failed to generate report: ${err}`)
      api.log(`Time reports error: ${err}`, 'error')
    } finally {
      setLoading(false)
    }
  }, [period, context.userId, api])

  useEffect(() => {
    loadReport()
  }, [loadReport])

  if (loading) {
    return (
      <div className="p-4 border rounded-lg">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 border rounded-lg bg-red-50">
        <div className="text-red-600 text-sm">{error}</div>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="p-4 border rounded-lg">
        <div className="text-center text-gray-600">No report data available</div>
      </div>
    )
  }

  return (
    <div className="p-4 border rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold">Time Reports</h4>
        <button
          onClick={() => api.showModal('ReportPeriodSelector', { 
            period, 
            onSelect: setPeriod 
          })}
          className="text-sm text-blue-600 hover:underline"
        >
          Change Period
        </button>
      </div>

      <div className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 bg-blue-50 rounded">
            <div className="text-sm text-blue-600 font-medium">Total Time</div>
            <div className="text-lg font-bold">{timeService.formatDuration(report.totalTime)}</div>
          </div>
          <div className="p-3 bg-green-50 rounded">
            <div className="text-sm text-green-600 font-medium">Billable Time</div>
            <div className="text-lg font-bold">{timeService.formatDuration(report.billableTime)}</div>
          </div>
          <div className="p-3 bg-purple-50 rounded">
            <div className="text-sm text-purple-600 font-medium">Earnings</div>
            <div className="text-lg font-bold">{timeService.formatEarnings(report.totalEarnings)}</div>
          </div>
        </div>

        {/* Project Breakdown */}
        <div>
          <h5 className="font-medium text-sm mb-2">By Project</h5>
          <div className="space-y-1">
            {report.breakdown.byProject.map(item => (
              <div key={item.projectId} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                <span>{item.projectName}</span>
                <div className="text-right">
                  <div>{timeService.formatDuration(item.time)}</div>
                  <div className="text-xs text-gray-600">{timeService.formatEarnings(item.earnings)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Daily Breakdown */}
        <div>
          <h5 className="font-medium text-sm mb-2">Daily Breakdown</h5>
          <div className="space-y-1">
            {report.breakdown.byDay.slice(-7).map(item => (
              <div key={item.date} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                <span>{new Date(item.date).toLocaleDateString()}</span>
                <div className="text-right">
                  <div>{timeService.formatDuration(item.time)}</div>
                  <div className="text-xs text-gray-600">{timeService.formatEarnings(item.earnings)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// Export the extension code
export const timeTrackingCode = `
import React, { useState, useEffect, useCallback } from 'react'

// Time Tracking Types
interface TimeEntry {
  id: string
  taskId: string
  projectId: string
  userId: string
  startTime: Date
  endTime?: Date
  duration: number // in milliseconds
  description?: string
  tags: string[]
  billable: boolean
  hourlyRate?: number
  createdAt: Date
  updatedAt: Date
}

interface TimeTrackingSettings {
  defaultHourlyRate: number
  autoStart: boolean
  reminders: {
    enabled: boolean
    interval: number // in minutes
    message: string
  }
  reports: {
    includeWeekends: boolean
    defaultPeriod: 'day' | 'week' | 'month' | 'quarter' | 'year'
    currency: string
  }
  integrations: {
    harvest: boolean
    toggl: boolean
    clockify: boolean
  }
}

// Time Tracking Service
class TimeTrackingService {
  constructor() {
    this.settings = null
    this.currentEntry = null
    this.timer = null
  }

  async loadSettings(api) {
    try {
      const settings = await api.getStorage('time-tracking-settings')
      this.settings = settings
      return settings
    } catch (error) {
      api.log(\`Failed to load time tracking settings: \${error}\`, 'error')
      return null
    }
  }

  async saveSettings(api, settings) {
    try {
      await api.setStorage('time-tracking-settings', settings)
      this.settings = settings
    } catch (error) {
      api.log(\`Failed to save time tracking settings: \${error}\`, 'error')
      throw error
    }
  }

  async getTimeEntries(api, filters) {
    try {
      const entries = await api.getStorage('time-entries') || []
      
      if (!filters) return entries
      
      return entries.filter(entry => {
        if (filters.taskId && entry.taskId !== filters.taskId) return false
        if (filters.projectId && entry.projectId !== filters.projectId) return false
        if (filters.userId && entry.userId !== filters.userId) return false
        if (filters.startDate && entry.startTime < filters.startDate) return false
        if (filters.endDate && entry.startTime > filters.endDate) return false
        return true
      })
    } catch (error) {
      api.log(\`Failed to get time entries: \${error}\`, 'error')
      return []
    }
  }

  async saveTimeEntry(api, entry) {
    try {
      const entries = await this.getTimeEntries(api)
      const existingIndex = entries.findIndex(e => e.id === entry.id)
      
      if (existingIndex >= 0) {
        entries[existingIndex] = entry
      } else {
        entries.push(entry)
      }
      
      await api.setStorage('time-entries', entries)
    } catch (error) {
      api.log(\`Failed to save time entry: \${error}\`, 'error')
      throw error
    }
  }

  async startTracking(api, taskId, projectId, userId, description) {
    if (this.currentEntry) {
      throw new Error('Another time entry is already running')
    }

    const entry = {
      id: \`time-\${Date.now()}-\${Math.random().toString(36).substr(2, 9)}\`,
      taskId,
      projectId,
      userId,
      startTime: new Date(),
      duration: 0,
      description,
      tags: [],
      billable: true,
      hourlyRate: this.settings?.defaultHourlyRate,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    this.currentEntry = entry
    await this.saveTimeEntry(api, entry)

    // Start timer
    this.timer = setInterval(() => {
      if (this.currentEntry) {
        this.currentEntry.duration = Date.now() - this.currentEntry.startTime.getTime()
        this.currentEntry.updatedAt = new Date()
        this.saveTimeEntry(api, this.currentEntry)
      }
    }, 1000) // Update every second

    return entry
  }

  async stopTracking(api) {
    if (!this.currentEntry) {
      return null
    }

    const entry = this.currentEntry
    entry.endTime = new Date()
    entry.duration = entry.endTime.getTime() - entry.startTime.getTime()
    entry.updatedAt = new Date()

    await this.saveTimeEntry(api, entry)

    // Clear timer
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }

    this.currentEntry = null
    return entry
  }

  getCurrentEntry() {
    return this.currentEntry
  }

  isTracking() {
    return this.currentEntry !== null
  }

  formatDuration(milliseconds) {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60))
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000)
    
    if (hours > 0) {
      return \`\${hours}:\${minutes.toString().padStart(2, '0')}:\${seconds.toString().padStart(2, '0')}\`
    } else {
      return \`\${minutes}:\${seconds.toString().padStart(2, '0')}\`
    }
  }

  formatEarnings(amount, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency
    }).format(amount)
  }
}

// Time Tracker Component
function TimeTracker({ context, api }) {
  const [settings, setSettings] = useState(null)
  const [currentEntry, setCurrentEntry] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [duration, setDuration] = useState(0)

  const timeService = new TimeTrackingService()

  // Load settings and current entry
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const loadedSettings = await timeService.loadSettings(api)
        setSettings(loadedSettings)
        
        const current = timeService.getCurrentEntry()
        setCurrentEntry(current)
        
        if (current) {
          // Start duration update timer
          const timer = setInterval(() => {
            const now = Date.now()
            const elapsed = now - current.startTime.getTime()
            setDuration(elapsed)
          }, 1000)
          
          return () => clearInterval(timer)
        }
      } catch (err) {
        setError(\`Failed to load time tracking data: \${err}\`)
        api.log(\`Time tracking error: \${err}\`, 'error')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // Handle start tracking
  const handleStart = async () => {
    if (!context.taskId || !context.projectId || !context.userId) {
      api.showToast('Missing required context for time tracking', 'error')
      return
    }

    try {
      const entry = await timeService.startTracking(
        api,
        context.taskId,
        context.projectId,
        context.userId,
        'Time tracking started'
      )
      setCurrentEntry(entry)
      setDuration(0)
      api.showToast('Time tracking started', 'success')
    } catch (err) {
      api.showToast(\`Failed to start tracking: \${err}\`, 'error')
    }
  }

  // Handle stop tracking
  const handleStop = async () => {
    try {
      const entry = await timeService.stopTracking(api)
      if (entry) {
        setCurrentEntry(null)
        setDuration(0)
        api.showToast(\`Time tracking stopped. Duration: \${timeService.formatDuration(entry.duration)}\`, 'success')
      }
    } catch (err) {
      api.showToast(\`Failed to stop tracking: \${err}\`, 'error')
    }
  }

  if (loading) {
    return (
      <div className="p-4 border rounded-lg">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto" />
      </div>
    )
  }

  return (
    <div className="p-4 border rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold">Time Tracking</h4>
      </div>

      {error && (
        <div className="text-red-600 text-sm mb-3">{error}</div>
      )}

      <div className="space-y-3">
        {/* Current Timer */}
        {currentEntry ? (
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-mono font-bold text-green-600 mb-2">
              {timeService.formatDuration(duration)}
            </div>
            <div className="text-sm text-gray-600 mb-3">
              Started at {currentEntry.startTime.toLocaleTimeString()}
            </div>
            <button
              onClick={handleStop}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Stop Tracking
            </button>
          </div>
        ) : (
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-lg font-semibold text-gray-600 mb-3">
              Ready to track time
            </div>
            <button
              onClick={handleStart}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Start Tracking
            </button>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="p-2 bg-blue-50 rounded">
            <div className="font-semibold text-blue-600">Today</div>
            <div className="text-gray-600">0h 0m</div>
          </div>
          <div className="p-2 bg-purple-50 rounded">
            <div className="font-semibold text-purple-600">This Week</div>
            <div className="text-gray-600">0h 0m</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Time Reports Component
const timeServiceInstance = new TimeTrackingService()

function TimeReports({ context, api }) {
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Load report
  const loadReport = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const period = {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        end: new Date()
      }
      const reportData = await timeServiceInstance.generateReport(api, period, context.userId)
      setReport(reportData)
    } catch (err) {
      setError(\`Failed to generate report: \${err}\`)
      api.log(\`Time reports error: \${err}\`, 'error')
    } finally {
      setLoading(false)
    }
  }, [context.userId])

  useEffect(() => {
    loadReport()
  }, [loadReport])

  if (loading) {
    return (
      <div className="p-4 border rounded-lg">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 border rounded-lg bg-red-50">
        <div className="text-red-600 text-sm">{error}</div>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="p-4 border rounded-lg">
        <div className="text-center text-gray-600">No report data available</div>
      </div>
    )
  }

  return (
    <div className="p-4 border rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold">Time Reports</h4>
      </div>

      <div className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 bg-blue-50 rounded">
            <div className="text-sm text-blue-600 font-medium">Total Time</div>
            <div className="text-lg font-bold">{timeService.formatDuration(report.totalTime)}</div>
          </div>
          <div className="p-3 bg-green-50 rounded">
            <div className="text-sm text-green-600 font-medium">Billable Time</div>
            <div className="text-lg font-bold">{timeService.formatDuration(report.billableTime)}</div>
          </div>
          <div className="p-3 bg-purple-50 rounded">
            <div className="text-sm text-purple-600 font-medium">Earnings</div>
            <div className="text-lg font-bold">{timeService.formatEarnings(report.totalEarnings)}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Export components
export default {
  TimeTracker,
  TimeReports
}
`
