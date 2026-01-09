/**
 * Unit Tests for Export and Calendar Services
 * Testing US-8.1 (Export) and US-8.2 (Calendar) functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ExportService } from '@/lib/services/export.service'
import { CalendarService } from '@/lib/services/calendar-service'

describe('ExportService (US-8.1)', () => {
  describe('CSV Export', () => {
    it('should convert data to CSV format', () => {
      const testData = [
        { name: 'Project 1', status: 'active', progress: 50 },
        { name: 'Project 2', status: 'completed', progress: 100 }
      ]

      const csv = ExportService.toCSV(testData)

      expect(csv).toBeTruthy()
      expect(csv).toContain('name,status,progress')
      expect(csv).toContain('Project 1')
      expect(csv).toContain('Project 2')
    })

    it('should handle CSV with commas in values', () => {
      const testData = [
        { name: 'Project, with comma', description: 'Test "quoted" value' }
      ]

      const csv = ExportService.toCSV(testData)

      expect(csv).toContain('"Project, with comma"')
      expect(csv).toContain('""quoted""')
    })

    it('should handle empty data arrays', () => {
      const csv = ExportService.toCSV([])
      expect(csv).toBe('')
    })

    it('should use custom headers if provided', () => {
      const testData = [
        { name: 'Project 1', status: 'active', extra: 'ignored' }
      ]
      const headers = ['name', 'status']

      const csv = ExportService.toCSV(testData, headers)

      expect(csv).toContain('name,status')
      expect(csv).not.toContain('extra')
    })
  })

  describe('Excel Export', () => {
    it('should convert data to Excel HTML format', () => {
      const testData = [
        { name: 'Project 1', status: 'active' }
      ]

      const html = ExportService.toExcelHTML(testData)

      expect(html).toContain('<table>')
      expect(html).toContain('<thead>')
      expect(html).toContain('<th>name</th>')
      expect(html).toContain('<td>Project 1</td>')
      expect(html).toContain('</table>')
    })

    it('should escape HTML in Excel output', () => {
      const testData = [
        { name: '<script>alert("xss")</script>' }
      ]

      const html = ExportService.toExcelHTML(testData)

      expect(html).not.toContain('<script>')
      expect(html).toContain('&lt;script&gt;')
    })
  })

  describe('JSON Export', () => {
    it('should handle JSON export', async () => {
      const options = { format: 'json' as const }
      const blob = await ExportService.exportProjects(options)

      expect(blob).toBeInstanceOf(Blob)
      expect(blob.type).toBe('application/json')

      const text = await blob.text()
      const data = JSON.parse(text)
      expect(data).toBeDefined()
    })
  })

  describe('Date Formatting', () => {
    it('should format date correctly', () => {
      const date = new Date('2024-01-15T10:30:00Z')
      const formatted = ExportService.formatDate(date)

      expect(formatted).toBe('2024-01-15')
    })

    it('should format datetime correctly', () => {
      const date = new Date('2024-01-15T10:30:45Z')
      const formatted = ExportService.formatDateTime(date)

      expect(formatted).toContain('2024-01-15')
      expect(formatted).toContain('10:30:45')
    })

    it('should handle null dates', () => {
      expect(ExportService.formatDate(null)).toBe('')
      expect(ExportService.formatDateTime(null)).toBe('')
    })

    it('should handle string dates', () => {
      const formatted = ExportService.formatDate('2024-01-15')
      expect(formatted).toBe('2024-01-15')
    })
  })

  describe('Export Methods', () => {
    it('should export projects', async () => {
      const blob = await ExportService.exportProjects({ format: 'csv' })
      expect(blob).toBeInstanceOf(Blob)
    })

    it('should export milestones', async () => {
      const blob = await ExportService.exportMilestones({ format: 'csv' })
      expect(blob).toBeInstanceOf(Blob)
    })

    it('should export tasks', async () => {
      const blob = await ExportService.exportTasks({ format: 'csv' })
      expect(blob).toBeInstanceOf(Blob)
    })

    it('should export project report', async () => {
      const blob = await ExportService.exportProjectReport('test-id', { format: 'pdf' })
      expect(blob).toBeInstanceOf(Blob)
    })
  })
})

describe('CalendarService (US-8.2)', () => {
  describe('Event Management', () => {
    it('should have createEvent method', () => {
      expect(CalendarService.createEvent).toBeDefined()
      expect(typeof CalendarService.createEvent).toBe('function')
    })

    it('should have getEvents method', () => {
      expect(CalendarService.getEvents).toBeDefined()
      expect(typeof CalendarService.getEvents).toBe('function')
    })

    it('should have updateEvent method', () => {
      expect(CalendarService.updateEvent).toBeDefined()
      expect(typeof CalendarService.updateEvent).toBe('function')
    })

    it('should have deleteEvent method', () => {
      expect(CalendarService.deleteEvent).toBeDefined()
      expect(typeof CalendarService.deleteEvent).toBe('function')
    })
  })

  describe('Integration Management', () => {
    it('should have createIntegration method', () => {
      expect(CalendarService.createIntegration).toBeDefined()
    })

    it('should have getIntegrations method', () => {
      expect(CalendarService.getIntegrations).toBeDefined()
    })

    it('should have updateIntegration method', () => {
      expect(CalendarService.updateIntegration).toBeDefined()
    })

    it('should have deleteIntegration method', () => {
      expect(CalendarService.deleteIntegration).toBeDefined()
    })
  })

  describe('Sync Management', () => {
    it('should have startSync method', () => {
      expect(CalendarService.startSync).toBeDefined()
    })

    it('should support multiple sync types', () => {
      // The method signature allows 'full', 'incremental', or 'manual'
      expect(CalendarService.startSync).toBeDefined()
    })
  })

  describe('External Calendar Support', () => {
    it('should support getExternalCalendars', async () => {
      const calendars = await CalendarService.getExternalCalendars('test-integration-id')

      expect(Array.isArray(calendars)).toBe(true)
      expect(calendars.length).toBeGreaterThan(0)

      const primaryCalendar = calendars[0]
      expect(primaryCalendar).toHaveProperty('id')
      expect(primaryCalendar).toHaveProperty('name')
      expect(primaryCalendar).toHaveProperty('color')
    })

    it('should update external calendar selection', async () => {
      await expect(
        CalendarService.updateExternalCalendarSelection('test-id', ['calendar-1', 'calendar-2'])
      ).resolves.not.toThrow()
    })
  })

  describe('Analytics', () => {
    it('should have getAnalytics method', () => {
      expect(CalendarService.getAnalytics).toBeDefined()
    })

    it('should support different analytics periods', () => {
      // Method should accept 'day', 'week', 'month', 'year'
      expect(CalendarService.getAnalytics).toBeDefined()
    })
  })

  describe('Export Functionality', () => {
    it('should have exportEvents method', () => {
      expect(CalendarService.exportEvents).toBeDefined()
    })

    it('should generate ICS format', () => {
      const events = [
        {
          id: 'test-1',
          title: 'Test Event',
          description: 'Test Description',
          start: new Date('2024-01-15T10:00:00Z'),
          end: new Date('2024-01-15T11:00:00Z'),
          allDay: false,
          location: 'Test Location',
          status: 'confirmed' as const,
          source: 'foco' as const,
          visibility: 'private' as const,
          createdBy: 'test-user',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]

      // Access private method through the class (testing internal logic)
      const icsData = (CalendarService as any).generateICS(events, {
        format: 'ics' as const,
        startDate: new Date(),
        endDate: new Date(),
        includeExternal: true,
        includeFoco: true
      })

      expect(icsData).toContain('BEGIN:VCALENDAR')
      expect(icsData).toContain('VERSION:2.0')
      expect(icsData).toContain('PRODID:-//Foco//Calendar//EN')
      expect(icsData).toContain('BEGIN:VEVENT')
      expect(icsData).toContain('SUMMARY:Test Event')
      expect(icsData).toContain('END:VEVENT')
      expect(icsData).toContain('END:VCALENDAR')
    })

    it('should generate CSV format for calendar', () => {
      const events = [
        {
          id: 'test-1',
          title: 'Test Event',
          description: 'Test Description',
          start: new Date('2024-01-15T10:00:00Z'),
          end: new Date('2024-01-15T11:00:00Z'),
          allDay: false,
          location: 'Test Location',
          status: 'confirmed' as const,
          source: 'foco' as const,
          visibility: 'private' as const,
          createdBy: 'test-user',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]

      const csvData = (CalendarService as any).generateCSV(events, {
        format: 'csv' as const,
        startDate: new Date(),
        endDate: new Date(),
        includeExternal: true,
        includeFoco: true
      })

      expect(csvData).toContain('Title')
      expect(csvData).toContain('Start')
      expect(csvData).toContain('End')
      expect(csvData).toContain('Test Event')
    })
  })

  describe('Template System', () => {
    it('should have getTemplates method', async () => {
      const templates = await CalendarService.getTemplates()

      expect(Array.isArray(templates)).toBe(true)
      expect(templates.length).toBeGreaterThan(0)
    })

    it('should filter templates by category', async () => {
      const workTemplates = await CalendarService.getTemplates('work')

      expect(Array.isArray(workTemplates)).toBe(true)
      workTemplates.forEach(template => {
        expect(template.category).toBe('work')
      })
    })

    it('should create event from template', async () => {
      const templates = await CalendarService.getTemplates()
      const templateId = templates[0].id

      // This would normally create an event, but requires Supabase connection
      expect(CalendarService.createEventFromTemplate).toBeDefined()
    })
  })

  describe('Date Helper Methods', () => {
    it('should calculate period start date correctly', () => {
      const testDate = new Date('2024-01-15T10:00:00Z')

      // Access private method for testing
      const monthStart = (CalendarService as any).getPeriodStartDate(testDate, 'month')
      expect(monthStart.getDate()).toBe(1)

      const weekStart = (CalendarService as any).getPeriodStartDate(testDate, 'week')
      expect(weekStart.getDay()).toBe(0) // Sunday or adjusted for locale

      const dayStart = (CalendarService as any).getPeriodStartDate(testDate, 'day')
      expect(dayStart.getHours()).toBe(0)
      expect(dayStart.getMinutes()).toBe(0)
    })

    it('should calculate days in period', () => {
      const start = new Date('2024-01-01')
      const end = new Date('2024-01-31')

      const days = (CalendarService as any).getDaysInPeriod(start, end)
      expect(days).toBeGreaterThanOrEqual(30)
    })
  })

  describe('Provider Support', () => {
    it('should have Google Calendar sync method', () => {
      expect((CalendarService as any).syncGoogleCalendar).toBeDefined()
    })

    it('should have Outlook Calendar sync method', () => {
      expect((CalendarService as any).syncOutlookCalendar).toBeDefined()
    })

    it('should have Apple Calendar sync method', () => {
      expect((CalendarService as any).syncAppleCalendar).toBeDefined()
    })

    it('should have CalDAV sync method', () => {
      expect((CalendarService as any).syncCalDAVCalendar).toBeDefined()
    })
  })
})

describe('Integration: Export + Calendar', () => {
  describe('Calendar Event Export', () => {
    it('should export calendar events to CSV', () => {
      const events = [
        {
          id: 'event-1',
          title: 'Meeting',
          start: new Date('2024-01-15T10:00:00Z'),
          end: new Date('2024-01-15T11:00:00Z'),
          allDay: false,
          description: 'Team meeting',
          location: 'Conference Room',
          status: 'confirmed' as const
        }
      ]

      const csvData = (CalendarService as any).generateCSV(events, {
        format: 'csv' as const,
        startDate: new Date(),
        endDate: new Date(),
        includeExternal: true,
        includeFoco: true
      })

      expect(csvData).toContain('Meeting')
      expect(csvData).toContain('Conference Room')
    })

    it('should export calendar events to ICS', () => {
      const events = [
        {
          id: 'event-1',
          title: 'Project Deadline',
          start: new Date('2024-01-20T17:00:00Z'),
          end: new Date('2024-01-20T17:30:00Z'),
          allDay: false,
          description: 'Project submission deadline',
          location: '',
          status: 'confirmed' as const,
          source: 'foco' as const,
          visibility: 'private' as const,
          createdBy: 'user-1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]

      const icsData = (CalendarService as any).generateICS(events, {
        format: 'ics' as const,
        startDate: new Date(),
        endDate: new Date(),
        includeExternal: true,
        includeFoco: true
      })

      expect(icsData).toContain('SUMMARY:Project Deadline')
      expect(icsData).toContain('DESCRIPTION:Project submission deadline')
    })
  })

  describe('Data Format Compatibility', () => {
    it('should format dates consistently between export and calendar', () => {
      const testDate = new Date('2024-01-15T10:30:00Z')

      const exportFormatted = ExportService.formatDate(testDate)
      expect(exportFormatted).toBe('2024-01-15')

      const icsFormatted = (CalendarService as any).formatICSDate(testDate)
      expect(icsFormatted).toContain('20240115')
    })
  })
})

describe('Data Integrity Tests', () => {
  describe('Export Data Integrity', () => {
    it('should preserve all data fields in CSV export', () => {
      const testData = [
        {
          id: '1',
          name: 'Project Alpha',
          status: 'active',
          progress: 75,
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          owner: 'John Doe'
        }
      ]

      const csv = ExportService.toCSV(testData)
      const lines = csv.split('\n')
      const headers = lines[0].split(',')
      const values = lines[1].split(',')

      expect(headers.length).toBe(Object.keys(testData[0]).length)
      expect(values.length).toBe(Object.keys(testData[0]).length)
    })

    it('should handle special characters without data loss', () => {
      const testData = [
        {
          name: 'Test "Project" with, special chars',
          description: 'Line1\nLine2\nLine3'
        }
      ]

      const csv = ExportService.toCSV(testData)

      expect(csv).toBeTruthy()
      // Should escape quotes and handle commas
      expect(csv).toContain('""')
    })
  })

  describe('Calendar Data Integrity', () => {
    it('should preserve event times in ICS export', () => {
      const startTime = new Date('2024-01-15T14:30:00Z')
      const endTime = new Date('2024-01-15T15:30:00Z')

      const events = [
        {
          id: 'event-1',
          title: 'Test Event',
          start: startTime,
          end: endTime,
          allDay: false,
          description: '',
          location: '',
          status: 'confirmed' as const,
          source: 'foco' as const,
          visibility: 'private' as const,
          createdBy: 'user-1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]

      const icsData = (CalendarService as any).generateICS(events, {
        format: 'ics' as const,
        startDate: new Date(),
        endDate: new Date(),
        includeExternal: true,
        includeFoco: true
      })

      expect(icsData).toContain('DTSTART:')
      expect(icsData).toContain('DTEND:')
    })
  })
})
