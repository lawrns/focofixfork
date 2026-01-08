'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Download,
  FileText,
  FileSpreadsheet,
  Calendar as CalendarIcon,
  Filter,
  Settings,
  CheckCircle,
  AlertTriangle,
  Loader2
} from 'lucide-react'
import { ExportService, type ExportOptions } from '@/lib/services/export.service'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

interface ExportDialogProps {
  trigger?: React.ReactNode
  organizationId?: string
  projectId?: string
  className?: string
}

export default function ExportDialog({
  trigger,
  organizationId,
  projectId,
  className
}: ExportDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState<string>('')
  const [exportResult, setExportResult] = useState<{ success: boolean; message: string } | null>(null)

  // Export options
  const [exportType, setExportType] = useState<'projects' | 'milestones' | 'tasks' | 'comprehensive'>('projects')
  const [exportFormat, setExportFormat] = useState<'csv' | 'pdf'>('csv')
  const [includeHeaders, setIncludeHeaders] = useState(true)
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
  const [dateRange, setDateRange] = useState<{ start: Date | undefined; end: Date | undefined }>({
    start: undefined,
    end: undefined
  })

  // Available statuses for filtering
  const statusOptions = {
    projects: ['planning', 'active', 'on_hold', 'completed', 'cancelled'],
    milestones: ['planning', 'active', 'on_hold', 'completed', 'cancelled'],
    tasks: ['todo', 'in_progress', 'review', 'completed', 'cancelled']
  }

  const handleStatusChange = (status: string, checked: boolean) => {
    setSelectedStatuses(prev =>
      checked
        ? [...prev, status]
        : prev.filter(s => s !== status)
    )
  }

  const handleExport = async () => {
    setIsExporting(true)
    setExportResult(null)
    setExportProgress('Preparing export...')

    try {
      const options: ExportOptions = {
        format: exportFormat,
        includeHeaders,
        status: selectedStatuses.length > 0 ? selectedStatuses : undefined,
        organizationId: exportType === 'comprehensive' ? projectId : organizationId,
        dateRange: dateRange.start && dateRange.end ? {
          start: dateRange.start,
          end: dateRange.end
        } : undefined
      }

      let blob: Blob
      let filename: string

      setExportProgress('Fetching data...')

      if (exportType === 'comprehensive' && projectId) {
        blob = await ExportService.exportProjectReport(projectId, options)
        filename = `project-report-${exportFormat === 'csv' ? 'data' : 'report'}-${exportFormat.toUpperCase()}.${exportFormat}`
      } else {
        switch (exportType) {
          case 'projects':
            blob = await ExportService.exportProjects(options)
            filename = `projects-${exportFormat === 'csv' ? 'data' : 'report'}-${exportFormat.toUpperCase()}.${exportFormat}`
            break
          case 'milestones':
            blob = await ExportService.exportMilestones(options)
            filename = `milestones-${exportFormat === 'csv' ? 'data' : 'report'}-${exportFormat.toUpperCase()}.${exportFormat}`
            break
          case 'tasks':
            blob = await ExportService.exportTasks(options)
            filename = `tasks-${exportFormat === 'csv' ? 'data' : 'report'}-${exportFormat.toUpperCase()}.${exportFormat}`
            break
          default:
            throw new Error('Invalid export type')
        }
      }

      setExportProgress('Downloading file...')

      ExportService.downloadFile(blob, filename)

      setExportResult({
        success: true,
        message: `Export completed successfully! File: ${filename}`
      })

      // Reset form on success
      setTimeout(() => {
        setIsOpen(false)
        setExportResult(null)
        setSelectedStatuses([])
        setDateRange({ start: undefined, end: undefined })
      }, 2000)

    } catch (error) {
      console.error('Export failed:', error)
      setExportResult({
        success: false,
        message: error instanceof Error ? error.message : 'Export failed. Please try again.'
      })
    } finally {
      setIsExporting(false)
      setExportProgress('')
    }
  }

  const getExportTypeIcon = (type: string) => {
    switch (type) {
      case 'projects':
        return <FileText className="w-5 h-5" />
      case 'milestones':
        return <FileSpreadsheet className="w-5 h-5" />
      case 'tasks':
        return <CheckCircle className="w-5 h-5" />
      case 'comprehensive':
        return <Settings className="w-5 h-5" />
      default:
        return <FileText className="w-5 h-5" />
    }
  }

  const getExportTypeDescription = (type: string) => {
    switch (type) {
      case 'projects':
        return 'Export all projects with their details and progress'
      case 'milestones':
        return 'Export milestones with status and timeline information'
      case 'tasks':
        return 'Export tasks with assignments and completion status'
      case 'comprehensive':
        return 'Complete project report including all data'
      default:
        return ''
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className={className}>
            <Download className="w-4 h-4 mr-2 opacity-70" />
            <span className="hidden md:inline">Export Data</span>
            <span className="md:hidden">Export</span>
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5 opacity-70" />
            Export Data
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Export Type Selection */}
          <div className="space-y-4">
            <Label className="text-base font-medium">What would you like to export?</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { value: 'projects', label: 'Projects' },
                { value: 'milestones', label: 'Milestones' },
                { value: 'tasks', label: 'Tasks' },
                ...(projectId ? [{ value: 'comprehensive', label: 'Complete Report' }] : [])
              ].map((type) => (
                <Card
                  key={type.value}
                  className={cn(
                    'cursor-pointer transition-all hover:shadow-md',
                    exportType === type.value ? 'ring-2 ring-primary bg-primary/5' : ''
                  )}
                  onClick={() => setExportType(type.value as any)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className={cn(
                        'p-2 rounded-lg',
                        exportType === type.value ? 'bg-primary text-primary-foreground' : 'bg-muted'
                      )}>
                        {getExportTypeIcon(type.value)}
                      </div>
                      <div>
                        <h3 className="font-medium">{type.label}</h3>
                        <p className="text-sm text-muted-foreground">
                          {getExportTypeDescription(type.value)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Format Selection */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Export Format</Label>
            <div className="flex gap-3">
              <Card
                className={cn(
                  'cursor-pointer transition-all hover:shadow-md flex-1',
                  exportFormat === 'csv' ? 'ring-2 ring-primary bg-primary/5' : ''
                )}
                onClick={() => setExportFormat('csv')}
              >
                <CardContent className="p-4 text-center">
                  <FileSpreadsheet className="w-8 h-8 mx-auto mb-2 text-green-600" />
                  <h3 className="font-medium">CSV</h3>
                  <p className="text-sm text-muted-foreground">Spreadsheet format</p>
                </CardContent>
              </Card>

              <Card
                className={cn(
                  'cursor-pointer transition-all hover:shadow-md flex-1',
                  exportFormat === 'pdf' ? 'ring-2 ring-primary bg-primary/5' : ''
                )}
                onClick={() => setExportFormat('pdf')}
              >
                <CardContent className="p-4 text-center">
                  <FileText className="w-8 h-8 mx-auto mb-2 text-red-600" />
                  <h3 className="font-medium">PDF</h3>
                  <p className="text-sm text-muted-foreground">Document format</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Filters */}
          <Tabs defaultValue="filters" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="filters" className="flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Filters
              </TabsTrigger>
              <TabsTrigger value="options" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Options
              </TabsTrigger>
            </TabsList>

            <TabsContent value="filters" className="space-y-4">
              {/* Status Filter */}
              <div className="space-y-3">
                <Label className="font-medium">Status Filter</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {statusOptions[exportType === 'comprehensive' ? 'projects' : exportType]?.map((status) => (
                    <div key={status} className="flex items-center space-x-2">
                      <Checkbox
                        id={status}
                        checked={selectedStatuses.includes(status)}
                        onCheckedChange={(checked) => handleStatusChange(status, checked as boolean)}
                      />
                      <Label htmlFor={status} className="text-sm capitalize">
                        {status.replace('_', ' ')}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Date Range Filter */}
              <div className="space-y-3">
                <Label className="font-medium">Date Range (Optional)</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm">Start Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            !dateRange.start && 'text-muted-foreground'
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateRange.start ? format(dateRange.start, 'PPP') : 'Select start date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={dateRange.start}
                          onSelect={(date) => setDateRange(prev => ({ ...prev, start: date }))}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">End Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            !dateRange.end && 'text-muted-foreground'
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateRange.end ? format(dateRange.end, 'PPP') : 'Select end date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={dateRange.end}
                          onSelect={(date) => setDateRange(prev => ({ ...prev, end: date }))}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="options" className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Include Headers</Label>
                    <p className="text-sm text-muted-foreground">Add column headers to the export</p>
                  </div>
                  <Checkbox
                    checked={includeHeaders}
                    onCheckedChange={(checked) => setIncludeHeaders(checked as boolean)}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Export Progress and Results */}
          <AnimatePresence>
            {exportProgress && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <Alert>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <AlertDescription>{exportProgress}</AlertDescription>
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {exportResult && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <Alert variant={exportResult.success ? 'default' : 'destructive'}>
                  {exportResult.success ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <AlertTriangle className="h-4 w-4" />
                  )}
                  <AlertDescription>{exportResult.message}</AlertDescription>
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isExporting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleExport}
              disabled={isExporting}
              className="min-w-[120px]"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Export {exportFormat.toUpperCase()}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
