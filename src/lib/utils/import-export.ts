'use client'

import { Project } from '@/features/projects/types'
import { Task } from '@/features/tasks/types'
import { Workspace } from '@/lib/models/organizations'
import { Label } from '@/lib/models/labels'

// ChecklistItem type (assuming it's part of Task)
interface ChecklistItem {
  id: string
  text: string
  completed: boolean
  created_at: string
  updated_at: string
}

// Export formats
export type ExportFormat = 'json' | 'csv' | 'markdown' | 'trello'

// Import formats
export type ImportFormat = 'trello' | 'csv' | 'asana' | 'jira'

// Export data structure
export interface ExportData {
  metadata: {
    exportedAt: string
    version: string
    format: ExportFormat
    source: 'foco'
  }
  data: {
    workspaces?: Workspace[]
    projects?: Project[]
    tasks?: Task[]
    labels?: Label[]
  }
}

// Import mapping for CSV
export interface CSVMapping {
  [key: string]: string // CSV column -> Foco field
}

// Import result
export interface ImportResult {
  success: boolean
  imported: {
    workspaces: number
    projects: number
    tasks: number
    labels: number
  }
  errors: string[]
  warnings: string[]
}

class ImportExportManager {
  // Export to JSON
  async exportToJSON(data: ExportData): Promise<string> {
    return JSON.stringify(data, null, 2)
  }

  // Export to CSV
  async exportToCSV(data: ExportData): Promise<string> {
    const csvRows: string[] = []
    
    // Add metadata header
    csvRows.push('# Foco Export')
    csvRows.push(`# Exported: ${data.metadata.exportedAt}`)
    csvRows.push(`# Format: ${data.metadata.format}`)
    csvRows.push('')
    
    // Export projects
    if (data.data.projects && data.data.projects.length > 0) {
      csvRows.push('# Projects')
      csvRows.push('Name,Description,Status,Due Date,Created At')
      data.data.projects.forEach(project => {
        csvRows.push([
          `"${project.name}"`,
          `"${project.description || ''}"`,
          project.status,
          project.due_date || '',
          project.created_at
        ].join(','))
      })
      csvRows.push('')
    }
    
    // Export tasks
    if (data.data.tasks && data.data.tasks.length > 0) {
      csvRows.push('# Tasks')
      csvRows.push('Title,Description,Status,Priority,Due Date,Project,Assignee,Created At')
      data.data.tasks.forEach(task => {
        csvRows.push([
          `"${task.title}"`,
          `"${task.description || ''}"`,
          task.status,
          task.priority || '',
          task.due_date || '',
          task.project_id || '',
          task.assignee_id || '',
          task.created_at
        ].join(','))
      })
      csvRows.push('')
    }
    
    return csvRows.join('\n')
  }

  // Export to Markdown
  async exportToMarkdown(data: ExportData): Promise<string> {
    const mdRows: string[] = []
    
    // Add header
    mdRows.push('# Foco Export')
    mdRows.push('')
    mdRows.push(`**Exported:** ${new Date(data.metadata.exportedAt).toLocaleString()}`)
    mdRows.push(`**Format:** ${data.metadata.format}`)
    mdRows.push('')
    
    // Export workspaces
    if (data.data.workspaces && data.data.workspaces.length > 0) {
      mdRows.push('## Workspaces')
      mdRows.push('')
      data.data.workspaces.forEach(ws => {
        mdRows.push(`### ${ws.name}`)
        mdRows.push(`- **Description:** ${ws.description || 'No description'}`)
        mdRows.push(`- **Created:** ${new Date(ws.created_at).toLocaleString()}`)
        mdRows.push('')
      })
    }
    
    // Export projects
    if (data.data.projects && data.data.projects.length > 0) {
      mdRows.push('## Projects')
      mdRows.push('')
      data.data.projects.forEach(project => {
        mdRows.push(`### ${project.name}`)
        mdRows.push(`- **Description:** ${project.description || 'No description'}`)
        mdRows.push(`- **Status:** ${project.status}`)
        mdRows.push(`- **Due Date:** ${project.due_date ? new Date(project.due_date).toLocaleDateString() : 'No due date'}`)
        mdRows.push(`- **Created:** ${new Date(project.created_at).toLocaleString()}`)
        mdRows.push('')
      })
    }
    
    // Export tasks
    if (data.data.tasks && data.data.tasks.length > 0) {
      mdRows.push('## Tasks')
      mdRows.push('')
      data.data.tasks.forEach(task => {
        mdRows.push(`### ${task.title}`)
        mdRows.push(`- **Description:** ${task.description || 'No description'}`)
        mdRows.push(`- **Status:** ${task.status}`)
        mdRows.push(`- **Priority:** ${task.priority || 'Normal'}`)
        mdRows.push(`- **Due Date:** ${task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date'}`)
        mdRows.push(`- **Created:** ${new Date(task.created_at).toLocaleString()}`)
        mdRows.push('')
      })
    }
    
    return mdRows.join('\n')
  }

  // Export to Trello format
  async exportToTrello(data: ExportData): Promise<string> {
    const trelloData = {
      name: 'Foco Export',
      desc: `Exported from Foco on ${new Date(data.metadata.exportedAt).toLocaleString()}`,
      lists: [] as any[],
      cards: [] as any[],
      checklists: [] as any[],
      labels: [] as any[]
    }
    
    // Convert projects to Trello lists
    if (data.data.projects) {
      data.data.projects.forEach(project => {
        trelloData.lists.push({
          name: project.name,
          desc: project.description || '',
          closed: project.status === 'completed'
        })
      })
    }
    
    // Convert tasks to Trello cards
    if (data.data.tasks) {
      data.data.tasks.forEach((task, index) => {
        const card = {
          name: task.title,
          desc: task.description || '',
          due: task.due_date || null,
          idList: Math.floor(index / 10), // Distribute across lists
          pos: index,
          labels: [] as string[]
        }
        
        // Add priority as label
        if (task.priority) {
          card.labels.push(task.priority)
        }
        
        trelloData.cards.push(card)
      })
    }
    
    // Convert labels
    if (data.data.labels) {
      data.data.labels.forEach(label => {
        trelloData.labels.push({
          name: label.name,
          color: label.color || 'blue'
        })
      })
    }
    
    return JSON.stringify(trelloData, null, 2)
  }

  // Import from Trello JSON
  async importFromTrello(trelloData: string): Promise<ImportResult> {
    const result: ImportResult = {
      success: true,
      imported: { workspaces: 0, projects: 0, tasks: 0, labels: 0 },
      errors: [],
      warnings: []
    }
    
    try {
      const data = JSON.parse(trelloData)
      
      // Import lists as projects
      if (data.lists && Array.isArray(data.lists)) {
        for (const list of data.lists) {
          try {
            // Create project
            const project = {
              name: list.name,
              description: list.desc || '',
              status: list.closed ? 'completed' : 'active',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
            
            // TODO: Save to database
            result.imported.projects++
          } catch (error) {
            result.errors.push(`Failed to import list "${list.name}": ${error}`)
          }
        }
      }
      
      // Import cards as tasks
      if (data.cards && Array.isArray(data.cards)) {
        for (const card of data.cards) {
          try {
            const task = {
              title: card.name,
              description: card.desc || '',
              status: 'todo',
              priority: card.labels && card.labels.length > 0 ? card.labels[0] : 'normal',
              due_date: card.due || null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
            
            // TODO: Save to database
            result.imported.tasks++
          } catch (error) {
            result.errors.push(`Failed to import card "${card.name}": ${error}`)
          }
        }
      }
      
      // Import labels
      if (data.labels && Array.isArray(data.labels)) {
        for (const label of data.labels) {
          try {
            const focoLabel = {
              name: label.name,
              color: label.color || 'blue',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
            
            // TODO: Save to database
            result.imported.labels++
          } catch (error) {
            result.errors.push(`Failed to import label "${label.name}": ${error}`)
          }
        }
      }
      
    } catch (error) {
      result.success = false
      result.errors.push(`Failed to parse Trello data: ${error}`)
    }
    
    return result
  }

  // Import from CSV
  async importFromCSV(csvData: string, mapping: CSVMapping): Promise<ImportResult> {
    const result: ImportResult = {
      success: true,
      imported: { workspaces: 0, projects: 0, tasks: 0, labels: 0 },
      errors: [],
      warnings: []
    }
    
    try {
      const lines = csvData.split('\n').filter(line => line.trim() && !line.startsWith('#'))
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''))
        
        if (values.length !== headers.length) {
          result.warnings.push(`Row ${i + 1}: Column count mismatch`)
          continue
        }
        
        const rowData: any = {}
        headers.forEach((header, index) => {
          rowData[header] = values[index]
        })
        
        // Map CSV data to Foco format
        const mappedData: any = {}
        Object.entries(mapping).forEach(([csvField, focoField]) => {
          if (rowData[csvField]) {
            mappedData[focoField] = rowData[csvField]
          }
        })
        
        // Determine if this is a project or task based on available fields
        if (mappedData.name && !mappedData.title) {
          // This looks like a project
          const project = {
            name: mappedData.name,
            description: mappedData.description || '',
            status: mappedData.status || 'active',
            due_date: mappedData.due_date || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
          
          // TODO: Save to database
          result.imported.projects++
        } else if (mappedData.title) {
          // This looks like a task
          const task = {
            title: mappedData.title,
            description: mappedData.description || '',
            status: mappedData.status || 'todo',
            priority: mappedData.priority || 'normal',
            due_date: mappedData.due_date || null,
            project_id: mappedData.project_id || null,
            assignee_id: mappedData.assignee_id || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
          
          // TODO: Save to database
          result.imported.tasks++
        }
      }
      
    } catch (error) {
      result.success = false
      result.errors.push(`Failed to parse CSV data: ${error}`)
    }
    
    return result
  }

  // Download file
  async downloadFile(content: string, filename: string, mimeType: string): Promise<void> {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    URL.revokeObjectURL(url)
  }

  // Upload file
  async uploadFile(): Promise<string> {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.json,.csv,.md'
      
      input.onchange = (event) => {
        const file = (event.target as HTMLInputElement).files?.[0]
        if (!file) {
          reject(new Error('No file selected'))
          return
        }
        
        const reader = new FileReader()
        reader.onload = (e) => {
          resolve(e.target?.result as string)
        }
        reader.onerror = () => {
          reject(new Error('Failed to read file'))
        }
        reader.readAsText(file)
      }
      
      input.click()
    })
  }

  // Validate import data
  validateImportData(data: string, format: ImportFormat): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    
    try {
      if (format === 'trello') {
        const parsed = JSON.parse(data)
        if (!parsed.lists && !parsed.cards) {
          errors.push('Invalid Trello format: missing lists or cards')
        }
      } else if (format === 'csv') {
        const lines = data.split('\n').filter(line => line.trim())
        if (lines.length < 2) {
          errors.push('CSV must have at least a header row and one data row')
        }
      }
    } catch (error) {
      errors.push(`Invalid ${format} format: ${error}`)
    }
    
    return {
      valid: errors.length === 0,
      errors
    }
  }
}

export const importExportManager = new ImportExportManager()

// Helper functions for common operations
export const exportData = async (data: ExportData, format: ExportFormat): Promise<string> => {
  switch (format) {
    case 'json':
      return importExportManager.exportToJSON(data)
    case 'csv':
      return importExportManager.exportToCSV(data)
    case 'markdown':
      return importExportManager.exportToMarkdown(data)
    case 'trello':
      return importExportManager.exportToTrello(data)
    default:
      throw new Error(`Unsupported export format: ${format}`)
  }
}

export const importData = async (data: string, format: ImportFormat, mapping?: CSVMapping): Promise<ImportResult> => {
  switch (format) {
    case 'trello':
      return importExportManager.importFromTrello(data)
    case 'csv':
      if (!mapping) {
        throw new Error('CSV mapping is required for CSV import')
      }
      return importExportManager.importFromCSV(data, mapping)
    default:
      throw new Error(`Unsupported import format: ${format}`)
  }
}

export const downloadExport = async (content: string, filename: string, format: ExportFormat): Promise<void> => {
  const mimeTypes = {
    json: 'application/json',
    csv: 'text/csv',
    markdown: 'text/markdown',
    trello: 'application/json'
  }
  
  const extensions = {
    json: '.json',
    csv: '.csv',
    markdown: '.md',
    trello: '.json'
  }
  
  await importExportManager.downloadFile(
    content,
    `${filename}${extensions[format]}`,
    mimeTypes[format]
  )
}

export const uploadImport = async (): Promise<{ content: string; filename: string; format: ImportFormat }> => {
  const content = await importExportManager.uploadFile()
  
  // Determine format from file extension
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json,.csv,.md'
  
  return new Promise((resolve, reject) => {
    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0]
      if (!file) {
        reject(new Error('No file selected'))
        return
      }
      
      const filename = file.name
      let format: ImportFormat
      
      if (filename.endsWith('.json')) {
        format = 'trello' // Assume Trello format for JSON
      } else if (filename.endsWith('.csv')) {
        format = 'csv'
      } else {
        reject(new Error('Unsupported file format'))
        return
      }
      
      resolve({ content, filename, format })
    }
    
    input.click()
  })
}
