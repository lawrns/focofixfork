'use client'

import { 
  ExportFormat, 
  ImportFormat, 
  ExportData, 
  ImportResult, 
  CSVMapping 
} from '@/lib/utils/import-export'
import { Project } from '@/features/projects/types'
import { Task } from '@/features/tasks/types'
import { Workspace } from '@/lib/models/organizations'
import { Label } from '@/lib/models/labels'

class ImportExportService {
  private baseUrl = '/api/import-export'

  // Export data via API
  async exportData(
    format: ExportFormat, 
    userId: string, 
    workspaceId?: string
  ): Promise<{ success: boolean; data?: ExportData; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          format,
          userId,
          workspaceId
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Export failed')
      }

      const result = await response.json()
      return { success: true, data: result.data }
    } catch (error) {
      return { success: false, error: error as string }
    }
  }

  // Import data via API
  async importData(
    data: any,
    format: ImportFormat,
    userId: string,
    mapping?: CSVMapping
  ): Promise<ImportResult> {
    try {
      const response = await fetch(`${this.baseUrl}/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data,
          format,
          userId,
          mapping
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Import failed')
      }

      const result = await response.json()
      return result.result
    } catch (error) {
      return {
        success: false,
        imported: { workspaces: 0, projects: 0, tasks: 0, labels: 0 },
        errors: [`Import failed: ${error}`],
        warnings: []
      }
    }
  }

  // Parse CSV content
  parseCSV(content: string): any[] {
    const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('#'))
    if (lines.length === 0) return []

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
    const rows = []

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''))
      
      if (values.length !== headers.length) {
        console.warn(`Row ${i + 1}: Column count mismatch`)
        continue
      }

      const row: any = {}
      headers.forEach((header, index) => {
        row[header] = values[index]
      })
      rows.push(row)
    }

    return rows
  }

  // Validate export data
  validateExportData(data: ExportData): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!data.metadata) {
      errors.push('Missing metadata')
    } else {
      if (!data.metadata.exportedAt) {
        errors.push('Missing export timestamp')
      }
      if (!data.metadata.format) {
        errors.push('Missing format')
      }
    }

    if (!data.data) {
      errors.push('Missing data')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  // Get import preview
  async getImportPreview(
    data: any,
    format: ImportFormat,
    mapping?: CSVMapping
  ): Promise<{ 
    valid: boolean; 
    preview: any[]; 
    errors: string[]; 
    warnings: string[] 
  }> {
    const result = {
      valid: true,
      preview: [] as any[],
      errors: [] as string[],
      warnings: [] as string[]
    }

    try {
      if (format === 'trello') {
        // Preview Trello data
        if (data.lists && Array.isArray(data.lists)) {
          result.preview.push(...data.lists.map((list: any) => ({
            type: 'project',
            name: list.name,
            description: list.desc || '',
            status: list.closed ? 'completed' : 'active'
          })))
        }

        if (data.cards && Array.isArray(data.cards)) {
          result.preview.push(...data.cards.map((card: any) => ({
            type: 'task',
            title: card.name,
            description: card.desc || '',
            status: 'todo',
            priority: card.labels && card.labels.length > 0 ? card.labels[0] : 'normal',
            due_date: card.due || null
          })))
        }

        if (data.labels && Array.isArray(data.labels)) {
          result.preview.push(...data.labels.map((label: any) => ({
            type: 'label',
            name: label.name,
            color: label.color || 'blue'
          })))
        }
      } else if (format === 'csv') {
        // Preview CSV data
        if (Array.isArray(data)) {
          result.preview = data.slice(0, 10) // Show first 10 rows
          if (data.length > 10) {
            result.warnings.push(`Showing preview of first 10 rows out of ${data.length} total rows`)
          }
        }
      }
    } catch (error) {
      result.valid = false
      result.errors.push(`Failed to preview data: ${error}`)
    }

    return result
  }

  // Estimate import time
  estimateImportTime(itemCount: number): number {
    // Rough estimate: 100ms per item
    return Math.max(1000, itemCount * 100)
  }

  // Get supported formats
  getSupportedExportFormats(): ExportFormat[] {
    return ['json', 'csv', 'markdown', 'trello']
  }

  getSupportedImportFormats(): ImportFormat[] {
    return ['trello', 'csv']
  }

  // Format file size
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Generate export filename
  generateExportFilename(format: ExportFormat, prefix: string = 'foco-export'): string {
    const timestamp = new Date().toISOString().split('T')[0]
    const extensions = {
      json: '.json',
      csv: '.csv',
      markdown: '.md',
      trello: '.json'
    }
    
    return `${prefix}-${timestamp}${extensions[format]}`
  }

  // Check if data is empty
  isDataEmpty(data: ExportData): boolean {
    const { data: exportData } = data
    return !exportData.workspaces?.length && 
           !exportData.projects?.length && 
           !exportData.tasks?.length && 
           !exportData.labels?.length
  }

  // Get data summary
  getDataSummary(data: ExportData): {
    workspaces: number
    projects: number
    tasks: number
    labels: number
    total: number
  } {
    const { data: exportData } = data
    return {
      workspaces: exportData.workspaces?.length || 0,
      projects: exportData.projects?.length || 0,
      tasks: exportData.tasks?.length || 0,
      labels: exportData.labels?.length || 0,
      total: (exportData.workspaces?.length || 0) + 
             (exportData.projects?.length || 0) + 
             (exportData.tasks?.length || 0) + 
             (exportData.labels?.length || 0)
    }
  }
}

export const importExportService = new ImportExportService()
