'use client'

import { useState, useCallback } from 'react'
import { 
  ExportFormat, 
  ImportFormat, 
  ExportData, 
  ImportResult, 
  CSVMapping,
  exportData,
  importData,
  downloadExport,
  uploadImport,
  importExportManager
} from '@/lib/utils/import-export'
import { Project } from '@/features/projects/types'
import { Task } from '@/features/tasks/types'
import { Organization } from '@/lib/models/organizations'
import { Label } from '@/lib/models/labels'
import { useToast } from '@/components/ui/toast'

interface UseImportExportOptions {
  projects?: Project[]
  tasks?: Task[]
  organizations?: Organization[]
  labels?: Label[]
  onDataChange?: () => void
}

export function useImportExport({
  projects = [],
  tasks = [],
  organizations = [],
  labels = [],
  onDataChange
}: UseImportExportOptions = {}) {
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [importProgress, setImportProgress] = useState(0)
  const [lastImportResult, setLastImportResult] = useState<ImportResult | null>(null)
  const toastNotification = useToast()

  // Export data
  const exportDataToFile = useCallback(async (format: ExportFormat, filename?: string) => {
    setIsExporting(true)
    setExportProgress(0)
    
    try {
      const dataToExport: ExportData = {
        metadata: {
          exportedAt: new Date().toISOString(),
          version: '1.0.0',
          format,
          source: 'foco'
        },
        data: {
          organizations: organizations.length > 0 ? organizations : undefined,
          projects: projects.length > 0 ? projects : undefined,
          tasks: tasks.length > 0 ? tasks : undefined,
          labels: labels.length > 0 ? labels : undefined
        }
      }
      
      setExportProgress(25)
      
      const content = await exportData(dataToExport, format)
      setExportProgress(50)
      
      const exportFilename = filename || `foco-export-${new Date().toISOString().split('T')[0]}`
      await downloadExport(content, exportFilename, format)
      setExportProgress(100)
      
      toastNotification.addToast({ type: 'success', title: 'Export Complete', description: `Successfully exported ${format.toUpperCase()} file` })
      
      return { success: true, content }
      
    } catch (error) {
      toastNotification.addToast({ type: 'error', title: 'Export Failed', description: `Export failed: ${error}` })
      return { success: false, error: error as Error }
    } finally {
      setIsExporting(false)
      setTimeout(() => setExportProgress(0), 1000)
    }
  }, [projects, tasks, organizations, labels, toastNotification])

  // Import data
  const importDataFromFile = useCallback(async (format: ImportFormat, mapping?: CSVMapping) => {
    setIsImporting(true)
    setImportProgress(0)
    setLastImportResult(null)
    
    try {
      const { content, format: detectedFormat } = await uploadImport()
      setImportProgress(25)
      
      // Use detected format if not specified
      const importFormat = format || detectedFormat
      
      // Validate data
      const validation = importExportManager.validateImportData(content, importFormat)
      if (!validation.valid) {
        throw new Error(`Invalid data: ${validation.errors.join(', ')}`)
      }
      
      setImportProgress(50)
      
      // Import data
      const result = await importData(content, importFormat, mapping)
      setImportProgress(100)
      
      setLastImportResult(result)
      
      if (result.success) {
        const totalImported = result.imported.projects + result.imported.tasks + result.imported.organizations + result.imported.labels
        toastNotification.addToast({ type: 'success', title: 'Import Complete', description: `Successfully imported ${totalImported} items` })
        onDataChange?.()
      } else {
        toastNotification.addToast({ type: 'error', title: 'Import Failed', description: `Import failed: ${result.errors.join(', ')}` })
      }
      
      return result
      
    } catch (error) {
      const errorResult: ImportResult = {
        success: false,
        imported: { organizations: 0, projects: 0, tasks: 0, labels: 0 },
        errors: [`Import failed: ${error}`],
        warnings: []
      }
      
      setLastImportResult(errorResult)
      toastNotification.addToast({ type: 'error', title: 'Import Failed', description: `Import failed: ${error}` })
      return errorResult
      
    } finally {
      setIsImporting(false)
      setTimeout(() => setImportProgress(0), 1000)
    }
  }, [toastNotification, onDataChange])

  // Quick export functions
  const exportToJSON = useCallback((filename?: string) => 
    exportDataToFile('json', filename), [exportDataToFile])
  
  const exportToCSV = useCallback((filename?: string) => 
    exportDataToFile('csv', filename), [exportDataToFile])
  
  const exportToMarkdown = useCallback((filename?: string) => 
    exportDataToFile('markdown', filename), [exportDataToFile])
  
  const exportToTrello = useCallback((filename?: string) => 
    exportDataToFile('trello', filename), [exportDataToFile])

  // Quick import functions
  const importFromTrello = useCallback(() => 
    importDataFromFile('trello'), [importDataFromFile])
  
  const importFromCSV = useCallback((mapping?: CSVMapping) => 
    importDataFromFile('csv', mapping), [importDataFromFile])

  // Get export summary
  const getExportSummary = useCallback(() => {
    return {
      organizations: organizations.length,
      projects: projects.length,
      tasks: tasks.length,
      labels: labels.length,
      total: organizations.length + projects.length + tasks.length + labels.length
    }
  }, [organizations, projects, tasks, labels])

  // Check if data is available for export
  const hasExportData = useCallback(() => {
    return organizations.length > 0 || projects.length > 0 || tasks.length > 0 || labels.length > 0
  }, [organizations, projects, tasks, labels])

  // Get supported export formats
  const getSupportedExportFormats = useCallback((): ExportFormat[] => {
    return ['json', 'csv', 'markdown', 'trello']
  }, [])

  // Get supported import formats
  const getSupportedImportFormats = useCallback((): ImportFormat[] => {
    return ['trello', 'csv']
  }, [])

  // Validate import file
  const validateImportFile = useCallback(async (format: ImportFormat) => {
    try {
      const { content, format: detectedFormat } = await uploadImport()
      const importFormat = format || detectedFormat
      
      return importExportManager.validateImportData(content, importFormat)
    } catch (error) {
      return {
        valid: false,
        errors: [`Failed to validate file: ${error}`]
      }
    }
  }, [])

  return {
    // State
    isExporting,
    isImporting,
    exportProgress,
    importProgress,
    lastImportResult,
    
    // Export functions
    exportDataToFile,
    exportToJSON,
    exportToCSV,
    exportToMarkdown,
    exportToTrello,
    
    // Import functions
    importDataFromFile,
    importFromTrello,
    importFromCSV,
    
    // Utility functions
    getExportSummary,
    hasExportData,
    getSupportedExportFormats,
    getSupportedImportFormats,
    validateImportFile
  }
}
