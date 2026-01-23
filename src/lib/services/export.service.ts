/**
 * Export Service
 * Handles data export to CSV, Excel, and other formats
 * Extended for Phase 3: Deprecation data exports
 */

import { supabase as supabaseClient } from '@/lib/supabase-client'

const untypedSupabase = supabaseClient as any

// Database row types for export queries
interface MilestoneRow {
  id: string
  name?: string
  title?: string
  due_date?: string | null
  start_date?: string | null
  status?: string
  [key: string]: any
}

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
      // Fetch milestones with timeline data
      const { data: milestones } = await untypedSupabase
        .from('milestones')
        .select('*')
        .eq('project_id', projectId)
        .order('start_date', { ascending: true })

      // Fetch tasks
      const milestoneList = (milestones || []) as MilestoneRow[]
      const { data: tasks } = await untypedSupabase
        .from('work_items')
        .select('id, title, parent_id, start_date, due_date, status, assignee_id')
        .in('parent_id', milestoneList.map((m: MilestoneRow) => m.id))

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
          ...(milestones || []).map((m: any) => ({
            type: 'milestone',
            id: m.id,
            title: m.name || m.title,
            due_date: this.formatDate(m.due_date),
            status: m.status,
          })),
          ...(tasks || []).map((t: any) => ({
            type: 'task',
            id: t.id,
            title: t.title,
            milestone_id: t.parent_id,
            due_date: this.formatDate(t.due_date || null),
            status: t.status || 'todo',
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
   * @deprecated Custom fields feature removed in Phase 3
   */
  static async exportCustomFields(workspaceId: string, options: ExportOptions = {}): Promise<void> {
    // Custom fields table no longer exists after Phase 3 migration
    console.warn('Custom fields feature removed in Phase 3 migration')
    
    const exportData = {
      workspace_id: workspaceId,
      export_type: 'custom_fields',
      exported_at: new Date().toISOString(),
      custom_fields: [],
      note: 'Custom fields were removed in Phase 3. Use AI-extracted metadata instead.',
    }

    const filename = options.filename || `custom-fields-export-${new Date().toISOString().split('T')[0]}`
    this.downloadJSON(exportData, filename)
  }

  /**
   * Export time tracking data from archive
   */
  static async exportTimeTracking(userId: string, options: ExportOptions = {}): Promise<void> {
    try {
      // Query archive table instead of time_entries
      let query = untypedSupabase
        .from('time_entries_archive')
        .select('*')
        .eq('user_id', userId)
        .order('start_time', { ascending: false })

      if (options.dateRange) {
        query = query
          .gte('start_time', options.dateRange.start)
          .lte('start_time', options.dateRange.end)
      }

      const { data: timeEntries } = await query

      const totalHours = (timeEntries || []).reduce((sum: number, entry: any) => {
        return sum + ((entry.duration_minutes || 0) / 60)
      }, 0)

      const exportData = {
        user_id: userId,
        export_type: 'time_tracking',
        exported_at: new Date().toISOString(),
        total_hours: totalHours,
        time_entries: timeEntries || [],
        note: 'Time tracking is archived. Focus on task completion instead.',
      }

      const filename = options.filename || `time-tracking-export-${new Date().toISOString().split('T')[0]}`

      if (options.format === 'json') {
        this.downloadJSON(exportData, filename)
      } else {
        this.downloadCSV(timeEntries || [], filename)
      }
    } catch (error) {
      console.warn('Time entries archive not found:', error)
      this.downloadJSON({
        user_id: userId,
        time_entries: [],
        note: 'No time tracking data found in archive',
      }, options.filename || 'time-tracking-export')
    }
  }

  /**
   * Export goals before migration to milestones
   * @deprecated Goals migrated to milestones in Phase 3
   */
  static async exportGoals(workspaceId: string, options: ExportOptions = {}): Promise<void> {
    // Goals table no longer exists after Phase 3 migration
    console.warn('Goals migrated to milestones in Phase 3 migration')
    
    const exportData = {
      workspace_id: workspaceId,
      export_type: 'goals_backup',
      exported_at: new Date().toISOString(),
      goals: [],
      note: 'Goals were migrated to Milestones in Phase 3. Query milestones with type="goal" instead.',
    }

    const filename = options.filename || `goals-export-${new Date().toISOString().split('T')[0]}`
    this.downloadJSON(exportData, filename)
  }

  /**
   * Export all deprecated data (comprehensive backup)
   */
  static async exportAllDeprecatedData(
    userId: string,
    workspaceId?: string
  ): Promise<{ success: boolean; exports: string[] }> {
    const exports: string[] = []

    try {
      // Export custom fields
      if (workspaceId) {
        await this.exportCustomFields(workspaceId, { format: 'json' })
        exports.push('custom_fields.json')
      }

      // Export time tracking
      await this.exportTimeTracking(userId, { format: 'csv' })
      exports.push('time_tracking.csv')

      // Export goals
      if (workspaceId) {
        await this.exportGoals(workspaceId, { format: 'json' })
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
