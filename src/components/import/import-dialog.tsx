'use client'

import React, { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import {
  Upload,
  FileText,
  FileSpreadsheet,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Loader2,
  Download,
  Eye,
  Settings
} from 'lucide-react'
import { ImportService, ImportResult } from '@/lib/services/import'

interface ImportDialogProps {
  trigger?: React.ReactNode
  organizationId?: string
  projectId?: string
  onImportComplete?: () => void
  className?: string
}

export default function ImportDialog({
  trigger,
  organizationId,
  projectId,
  onImportComplete,
  className
}: ImportDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileContent, setFileContent] = useState<string>('')

  // Import options
  const [importType, setImportType] = useState<'projects' | 'milestones' | 'tasks'>('projects')
  const [skipDuplicates, setSkipDuplicates] = useState(true)
  const [updateExisting, setUpdateExisting] = useState(false)
  const [validateOnly, setValidateOnly] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.csv')) {
      alert('Please select a CSV file')
      return
    }

    setSelectedFile(file)

    // Read file content
    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      setFileContent(content)
    }
    reader.readAsText(file)
  }

  const handleImport = async () => {
    if (!fileContent.trim()) {
      alert('Please select a file to import')
      return
    }

    setIsImporting(true)
    setImportProgress(0)
    setImportResult(null)

    try {
      setImportProgress(25)

      const options = {
        skipDuplicates,
        updateExisting,
        validateOnly
      }

      let result: ImportResult

      setImportProgress(50)

      switch (importType) {
        case 'projects':
          result = await ImportService.importProjects(fileContent, options)
          break
        case 'milestones':
          result = await ImportService.importMilestones(fileContent, options)
          break
        case 'tasks':
          result = await ImportService.importTasks(fileContent, options)
          break
        default:
          throw new Error('Invalid import type')
      }

      setImportProgress(100)
      setImportResult(result)

      if (result.success) {
        onImportComplete?.()
      }

    } catch (error) {
      console.error('Import failed:', error)
      setImportResult({
        success: false,
        totalRows: 0,
        importedRows: 0,
        errors: [error instanceof Error ? error.message : 'Import failed'],
        warnings: []
      })
    } finally {
      setIsImporting(false)
    }
  }

  const resetForm = () => {
    setSelectedFile(null)
    setFileContent('')
    setImportResult(null)
    setImportProgress(0)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const downloadTemplate = (type: string) => {
    let headers: string[]
    let sampleData: string[]

    switch (type) {
      case 'projects':
        headers = ['Name', 'Description', 'Status', 'Priority', 'Progress', 'Start Date', 'Due Date', 'Organization ID']
        sampleData = ['Website Redesign', 'Complete overhaul of company website', 'active', 'high', '25', '2024-01-15', '2024-03-15', '']
        break
      case 'milestones':
        headers = ['Name', 'Description', 'Status', 'Priority', 'Progress', 'Start Date', 'Due Date', 'Project Name']
        sampleData = ['Design Phase', 'Create wireframes and mockups', 'completed', 'high', '100', '2024-01-15', '2024-02-15', 'Website Redesign']
        break
      case 'tasks':
        headers = ['Name', 'Description', 'Status', 'Priority', 'Start Date', 'Due Date', 'Milestone Name', 'Assignee Name']
        sampleData = ['Create homepage wireframe', 'Design the main landing page', 'in_progress', 'medium', '2024-01-15', '2024-01-22', 'Design Phase', 'John Doe']
        break
      default:
        return
    }

    const csvContent = [headers.join(','), sampleData.join(',')].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${type}-template.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const getImportTypeIcon = (type: string) => {
    switch (type) {
      case 'projects':
        return <FileText className="w-5 h-5" />
      case 'milestones':
        return <FileSpreadsheet className="w-5 h-5" />
      case 'tasks':
        return <CheckCircle className="w-5 h-5" />
      default:
        return <FileText className="w-5 h-5" />
    }
  }

  const getImportTypeDescription = (type: string) => {
    switch (type) {
      case 'projects':
        return 'Import projects with their details and progress'
      case 'milestones':
        return 'Import milestones with status and timeline information'
      case 'tasks':
        return 'Import tasks with assignments and completion status'
      default:
        return ''
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className={className}>
            <Upload className="w-4 h-4 mr-2 opacity-70" />
            <span className="hidden sm:inline">Import Data</span>
            <span className="sm:hidden">Import</span>
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 opacity-70" />
            Import Data
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Import Type Selection */}
          <div className="space-y-4">
            <Label className="text-base font-medium">What would you like to import?</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { value: 'projects', label: 'Projects' },
                { value: 'milestones', label: 'Milestones' },
                { value: 'tasks', label: 'Tasks' }
              ].map((type) => (
                <Card
                  key={type.value}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    importType === type.value ? 'ring-2 ring-primary bg-primary/5' : ''
                  }`}
                  onClick={() => setImportType(type.value as any)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${
                        importType === type.value ? 'bg-primary text-primary-foreground' : 'bg-muted'
                      }`}>
                        {getImportTypeIcon(type.value)}
                      </div>
                      <div>
                        <h3 className="font-medium">{type.label}</h3>
                        <p className="text-sm text-muted-foreground">
                          {getImportTypeDescription(type.value)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Template Download */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <span className="text-sm font-medium">Need a template?</span>
                <p className="text-xs text-muted-foreground">Download a sample CSV file to get started</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadTemplate(importType)}
              >
                <Download className="w-4 h-4 mr-2" />
                Download Template
              </Button>
            </div>
          </div>

          {/* File Upload */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Upload CSV File</Label>

            <div
              className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />

              {selectedFile ? (
                <div className="space-y-2">
                  <FileSpreadsheet className="w-12 h-12 mx-auto text-green-600" />
                  <div>
                    <p className="font-medium">{selectedFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="w-12 h-12 mx-auto text-muted-foreground" />
                  <div>
                    <p className="font-medium">Click to upload CSV file</p>
                    <p className="text-sm text-muted-foreground">
                      Only CSV files are supported
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Import Options */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Import Options</Label>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Skip Duplicates</Label>
                  <p className="text-sm text-muted-foreground">Skip items that already exist</p>
                </div>
                  <Checkbox
                    checked={skipDuplicates}
                    onCheckedChange={(checked) => setSkipDuplicates(checked as boolean)}
                  />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Update Existing</Label>
                  <p className="text-sm text-muted-foreground">Update existing items instead of skipping</p>
                </div>
                  <Checkbox
                    checked={updateExisting}
                    onCheckedChange={(checked) => setUpdateExisting(checked as boolean)}
                  />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Validate Only</Label>
                  <p className="text-sm text-muted-foreground">Check data without importing</p>
                </div>
                  <Checkbox
                    checked={validateOnly}
                    onCheckedChange={(checked) => setValidateOnly(checked as boolean)}
                  />
              </div>
            </div>
          </div>

          {/* Import Progress */}
          <AnimatePresence>
            {isImporting && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Importing...</span>
                  <span className="text-sm text-muted-foreground">{importProgress}%</span>
                </div>
                <Progress value={importProgress} className="w-full" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Import Results */}
          <AnimatePresence>
            {importResult && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4"
              >
                <Alert variant={importResult.success ? 'default' : 'destructive'}>
                  {importResult.success ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="font-medium">
                        {importResult.success ? 'Import completed successfully!' : 'Import failed'}
                      </p>
                      <div className="text-sm space-y-1">
                        <p>Total rows: {importResult.totalRows}</p>
                        <p>Imported: {importResult.importedRows}</p>
                        {importResult.errors.length > 0 && (
                          <p className="text-destructive">Errors: {importResult.errors.length}</p>
                        )}
                        {importResult.warnings.length > 0 && (
                          <p className="text-yellow-600">Warnings: {importResult.warnings.length}</p>
                        )}
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>

                {/* Detailed Results */}
                {(importResult.errors.length > 0 || importResult.warnings.length > 0) && (
                  <div className="space-y-3 max-h-40 overflow-y-auto">
                    {importResult.errors.map((error, index) => (
                      <Alert key={`error-${index}`} variant="destructive">
                        <XCircle className="h-4 w-4" />
                        <AlertDescription className="text-sm">{error}</AlertDescription>
                      </Alert>
                    ))}

                    {importResult.warnings.map((warning, index) => (
                      <Alert key={`warning-${index}`}>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription className="text-sm">{warning}</AlertDescription>
                      </Alert>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                resetForm()
                setIsOpen(false)
              }}
              disabled={isImporting}
            >
              Close
            </Button>

            {!importResult?.success && (
              <Button
                onClick={handleImport}
                disabled={!selectedFile || isImporting}
                className="min-w-[120px]"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Import Data
                  </>
                )}
              </Button>
            )}

            {importResult?.success && (
              <Button
                onClick={() => {
                  resetForm()
                  setIsOpen(false)
                }}
              >
                Done
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
