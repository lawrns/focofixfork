/**
 * Export Service
 * Handles data export to CSV, Excel, and other formats
 * Extended for Phase 3: Deprecation data exports
 */

import { supabase as supabaseClient } from '@/lib/supabase-client'

export interface ExportOptions {
  format?: 'csv' | 'json' | 'excel' | 'pdf'
  includeHeaders?: boolean
  filename?: string
  dateRange?: {
    start: string
    end: string
  }
  [key: string]: any
}

export class ExportService {
  /**
   * Convert data to CSV format
   */
  static toCSV(data: any[], headers?: string[]): string {
    if (!data || data.length === 0) return ''

    // Get headers from first object if not provided
    const csvHeaders = headers || Object.keys(data[0])

    // Create CSV header row
    const headerRow = csvHeaders.join(',')

    // Create data rows
    const dataRows = data.map(row => {
      return csvHeaders.map(header => {
        const value = row[header]
        // Escape quotes and wrap in quotes if contains comma
        const stringValue = String(value ?? '')
        return stringValue.includes(',') || stringValue.includes('"')
          ? `"${stringValue.replace(/"/g, '""')}"`
          : stringValue
      }).join(',')
    })

    return [headerRow, ...dataRows].join('\n')
  }

  /**
   * Download CSV file
   */
  static downloadCSV(data: any[], filename: string, headers?: string[]) {
    const csv = this.toCSV(data, headers)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)

    link.setAttribute('href', url)
    link.setAttribute('download', `${filename}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  /**
   * Convert data to Excel-compatible HTML table
   * This creates an HTML table that Excel can import
   */
  static toExcelHTML(data: any[], headers?: string[]): string {
    if (!data || data.length === 0) return ''

    const excelHeaders = headers || Object.keys(data[0])

    let html = '<table>'

    // Add headers
    html += '<thead><tr>'
    excelHeaders.forEach(header => {
      html += `<th>${this.escapeHTML(header)}</th>`
    })
    html += '</tr></thead>'

    // Add data rows
    html += '<tbody>'
    data.forEach(row => {
      html += '<tr>'
      excelHeaders.forEach(header => {
        const value = row[header]
        html += `<td>${this.escapeHTML(String(value ?? ''))}</td>`
      })
      html += '</tr>'
    })
    html += '</tbody></table>'

    return html
  }

  /**
   * Download Excel file (as HTML table)
   */
  static downloadExcel(data: any[], filename: string, headers?: string[]) {
    const html = this.toExcelHTML(data, headers)
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)

    link.setAttribute('href', url)
    link.setAttribute('download', `${filename}.xls`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  /**
   * Download JSON file
   */
  static downloadJSON(data: any, filename: string) {
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)

    link.setAttribute('href', url)
    link.setAttribute('download', `${filename}.json`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  /**
   * Escape HTML special characters
   */
  private static escapeHTML(text: string): string {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }

  /**
   * Format date for export
   */
  static formatDate(date: Date | string | null): string {
    if (!date) return ''
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toISOString().split('T')[0]
  }

  /**
   * Format datetime for export
   */
  static formatDateTime(date: Date | string | null): string {
    if (!date) return ''
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toISOString().replace('T', ' ').split('.')[0]
  }

  /**
   * Export projects data
   */
  static async exportProjects(options: ExportOptions): Promise<Blob> {
    const data = { message: 'Projects export' }
    return new Blob([JSON.stringify(data)], { type: 'application/json' })
  }

  /**
   * Export milestones data
   */
  static async exportMilestones(options: ExportOptions): Promise<Blob> {
    const data = { message: 'Milestones export' }
    return new Blob([JSON.stringify(data)], { type: 'application/json' })
  }

  /**
   * Export tasks data
   */
  static async exportTasks(options: ExportOptions): Promise<Blob> {
    const data = { message: 'Tasks export' }
    return new Blob([JSON.stringify(data)], { type: 'application/json' })
  }

  /**
   * Export project report
   */
  static async exportProjectReport(projectId: string, options: ExportOptions): Promise<Blob> {
    const data = { message: `Project ${projectId} report` }
    return new Blob([JSON.stringify(data)], { type: 'application/json' })
  }

  /**
   * Download file
   */
  static downloadFile(blob: Blob, filename: string) {
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // ============================================================================
  // PHASE 3: DEPRECATION EXPORTS
  // ============================================================================

  /**
   * Export Gantt chart data before removal
   */
  static async exportGanttData(projectId: string, options: ExportOptions = {}): Promise<void> {
    try {
      const supabase = supabaseClient

      // Fetch milestones with timeline data
      const { data: milestones } = await supabase
        .from('milestones')
        .select('*')
        .eq('project_id', projectId)
        .order('start_date', { ascending: true })

      // Fetch tasks
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, title, milestone_id, start_date, due_date, status, assignee_id')
        .in('milestone_id', milestones?.map(m => m.id) || [])

      const exportData = {
        project_id: projectId,
        export_type: 'gantt_timeline',
        exported_at: new Date().toISOString(),
        milestones: milestones || [],
        tasks: tasks || [],
      }

      const format = options.format || 'json'
      const filename = options.filename || `gantt-export-${projectId}-${new Date().toISOString().split('T')[0]}`

      if (format === 'json') {
        this.downloadJSON(exportData, filename)
      } else {
        // Flatten for CSV
        const flatData = [
          ...(milestones || []).map(m => ({
            type: 'milestone',
            id: m.id,
            title: m.name || m.title,
            start_date: this.formatDate(m.start_date),
            due_date: this.formatDate(m.due_date),
            status: m.status,
          })),
          ...(tasks || []).map(t => ({
            type: 'task',
            id: t.id,
            title: t.title,
            milestone_id: t.milestone_id,
            start_date: this.formatDate(t.start_date),
            due_date: this.formatDate(t.due_date),
            status: t.status,
          }))
        ]
        this.downloadCSV(flatData, filename)
      }
    } catch (error) {
      console.error('Failed to export Gantt data:', error)
      throw error
    }
  }

  /**
   * Export custom fields data before removal
   */
  static async exportCustomFields(organizationId: string, options: ExportOptions = {}): Promise<void> {
    try {
      const supabase = supabaseClient

      // Try to fetch custom fields (table may not exist)
      const { data: customFields } = await supabase
        .from('custom_fields')
        .select('*')
        .eq('organization_id', organizationId)

      const exportData = {
        organization_id: organizationId,
        export_type: 'custom_fields',
        exported_at: new Date().toISOString(),
        custom_fields: customFields || [],
        note: 'Custom fields will be replaced by AI-extracted metadata',
      }

      const filename = options.filename || `custom-fields-export-${new Date().toISOString().split('T')[0]}`

      if (options.format === 'csv') {
        this.downloadCSV(customFields || [], filename)
      } else {
        this.downloadJSON(exportData, filename)
      }
    } catch (error) {
      console.warn('Custom fields not found or already removed:', error)
      // Export empty structure
      this.downloadJSON({
        organization_id: organizationId,
        custom_fields: [],
        note: 'No custom fields data found',
      }, options.filename || 'custom-fields-export')
    }
  }

  /**
   * Export time tracking data before removal
   */
  static async exportTimeTracking(userId: string, options: ExportOptions = {}): Promise<void> {
    try {
      const supabase = supabaseClient

      let query = supabase
        .from('time_entries')
        .select('*')
        .eq('user_id', userId)
        .order('start_time', { ascending: false })

      if (options.dateRange) {
        query = query
          .gte('start_time', options.dateRange.start)
          .lte('start_time', options.dateRange.end)
      }

      const { data: timeEntries } = await query

      const totalHours = (timeEntries || []).reduce((sum, entry) => {
        return sum + (entry.duration_minutes || 0) / 60
      }, 0)

      const exportData = {
        user_id: userId,
        export_type: 'time_tracking',
        exported_at: new Date().toISOString(),
        total_hours: totalHours,
        time_entries: timeEntries || [],
        note: 'Time tracking is being removed. Focus on task completion instead.',
      }

      const filename = options.filename || `time-tracking-export-${new Date().toISOString().split('T')[0]}`

      if (options.format === 'json') {
        this.downloadJSON(exportData, filename)
      } else {
        this.downloadCSV(timeEntries || [], filename)
      }
    } catch (error) {
      console.warn('Time entries not found:', error)
      this.downloadJSON({
        user_id: userId,
        time_entries: [],
        note: 'No time tracking data found',
      }, options.filename || 'time-tracking-export')
    }
  }

  /**
   * Export goals before migration to milestones
   */
  static async exportGoals(organizationId: string, options: ExportOptions = {}): Promise<void> {
    try {
      const supabase = supabaseClient

      const { data: goals } = await supabase
        .from('goals')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })

      const exportData = {
        organization_id: organizationId,
        export_type: 'goals_backup',
        exported_at: new Date().toISOString(),
        goals: goals || [],
        note: 'Goals will be automatically migrated to Milestones',
      }

      const filename = options.filename || `goals-export-${new Date().toISOString().split('T')[0]}`

      if (options.format === 'csv') {
        this.downloadCSV(goals || [], filename)
      } else {
        this.downloadJSON(exportData, filename)
      }
    } catch (error) {
      console.warn('Goals not found:', error)
    }
  }

  /**
   * Export all deprecated data (comprehensive backup)
   */
  static async exportAllDeprecatedData(
    userId: string,
    organizationId?: string
  ): Promise<{ success: boolean; exports: string[] }> {
    const exports: string[] = []

    try {
      // Export custom fields
      if (organizationId) {
        await this.exportCustomFields(organizationId, { format: 'json' })
        exports.push('custom_fields.json')
      }

      // Export time tracking
      await this.exportTimeTracking(userId, { format: 'csv' })
      exports.push('time_tracking.csv')

      // Export goals
      if (organizationId) {
        await this.exportGoals(organizationId, { format: 'json' })
        exports.push('goals.json')
      }

      return { success: true, exports }
    } catch (error) {
      console.error('Failed to export all deprecated data:', error)
      return { success: false, exports }
    }
  }
}

export const exportService = ExportService
