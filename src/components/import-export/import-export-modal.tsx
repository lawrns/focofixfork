'use client'

import { useState, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Download, 
  Upload, 
  FileText, 
  Table, 
  Code, 
  CheckCircle, 
  AlertCircle, 
  X,
  Settings,
  MapPin
} from 'lucide-react'
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
import { Label as LabelType } from '@/lib/models/labels'
import { useToast } from '@/components/toast/toast'

interface ImportExportModalProps {
  projects?: Project[]
  tasks?: Task[]
  organizations?: Organization[]
  labels?: LabelType[]
  onImportComplete?: (result: ImportResult) => void
  onExportComplete?: () => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
  defaultTab?: 'export' | 'import'
}

export function ImportExportModal({
  projects = [],
  tasks = [],
  organizations = [],
  labels = [],
  onImportComplete,
  onExportComplete,
  open,
  onOpenChange,
  defaultTab = 'export'
}: ImportExportModalProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isOpen = open !== undefined ? open : internalOpen
  const setIsOpen = onOpenChange ?? setInternalOpen
  const [activeTab, setActiveTab] = useState<'export' | 'import'>(defaultTab)
  const [exportFormat, setExportFormat] = useState<ExportFormat>('json')
  const [importFormat, setImportFormat] = useState<ImportFormat>('trello')
  const [csvMapping, setCsvMapping] = useState<CSVMapping>({})
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [showMapping, setShowMapping] = useState(false)
  const { toast: toastNotification } = useToast()

  // Sync activeTab with defaultTab when it changes (controlled component pattern)
  useEffect(() => {
    setActiveTab(defaultTab)
  }, [defaultTab])

  // Export handlers
  const handleExport = useCallback(async () => {
    setIsProcessing(true)
    setProgress(0)
    
    try {
      const dataToExport: ExportData = {
        metadata: {
          exportedAt: new Date().toISOString(),
          version: '1.0.0',
          format: exportFormat,
          source: 'foco'
        },
        data: {
          organizations: organizations.length > 0 ? organizations : undefined,
          projects: projects.length > 0 ? projects : undefined,
          tasks: tasks.length > 0 ? tasks : undefined,
          labels: labels.length > 0 ? labels : undefined
        }
      }
      
      setProgress(25)
      
      const content = await exportData(dataToExport, exportFormat)
      setProgress(50)
      
      const filename = `foco-export-${new Date().toISOString().split('T')[0]}`
      await downloadExport(content, filename, exportFormat)
      setProgress(100)
      
      toastNotification({
        variant: 'success',
        title: 'Export Complete',
        description: `Successfully exported ${exportFormat.toUpperCase()} file`
      })
      onExportComplete?.()
      
    } catch (error) {
      toastNotification({
        variant: 'destructive',
        title: 'Export Failed',
        description: `Export failed: ${error}`
      })
    } finally {
      setIsProcessing(false)
      setProgress(0)
    }
  }, [exportFormat, projects, tasks, organizations, labels, toastNotification, onExportComplete])

  // Import handlers
  const handleImport = useCallback(async () => {
    setIsProcessing(true)
    setProgress(0)
    setImportResult(null)
    
    try {
      const { content, format } = await uploadImport()
      setProgress(25)
      
      // Validate data
      const validation = importExportManager.validateImportData(content, format)
      if (!validation.valid) {
        throw new Error(`Invalid data: ${validation.errors.join(', ')}`)
      }
      
      setProgress(50)
      
      // Import data
      const result = await importData(content, format, format === 'csv' ? csvMapping : undefined)
      setProgress(100)
      
      setImportResult(result)
      
      if (result.success) {
        toastNotification({
          variant: 'success',
          title: 'Import Complete',
          description: `Successfully imported ${result.imported.projects + result.imported.tasks} items`
        })
        onImportComplete?.(result)
      } else {
        toastNotification({
          variant: 'destructive',
          title: 'Import Failed',
          description: `Import failed: ${result.errors.join(', ')}`
        })
      }
      
    } catch (error) {
      toastNotification({
        variant: 'destructive',
        title: 'Import Failed',
        description: `Import failed: ${error}`
      })
    } finally {
      setIsProcessing(false)
      setProgress(0)
    }
  }, [csvMapping, toastNotification, onImportComplete])

  // CSV mapping handlers
  const handleMappingChange = useCallback((csvField: string, focoField: string) => {
    setCsvMapping(prev => ({
      ...prev,
      [csvField]: focoField
    }))
  }, [])

  const removeMapping = useCallback((csvField: string) => {
    setCsvMapping(prev => {
      const newMapping = { ...prev }
      delete newMapping[csvField]
      return newMapping
    })
  }, [])

  // Common CSV fields
  const commonCsvFields = [
    'name', 'title', 'description', 'status', 'priority', 
    'due_date', 'created_at', 'assignee', 'project'
  ]

  const focoFields = [
    { value: 'name', label: 'Project Name' },
    { value: 'title', label: 'Task Title' },
    { value: 'description', label: 'Description' },
    { value: 'status', label: 'Status' },
    { value: 'priority', label: 'Priority' },
    { value: 'due_date', label: 'Due Date' },
    { value: 'project_id', label: 'Project ID' },
    { value: 'assignee_id', label: 'Assignee ID' }
  ]

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FileText className="w-4 h-4" />
          Import/Export
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import & Export Data</DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'export' | 'import')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="export" className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export
            </TabsTrigger>
            <TabsTrigger value="import" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Import
            </TabsTrigger>
          </TabsList>
          
          {/* Export Tab */}
          <TabsContent value="export" className="space-y-6">
            <Card className="p-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="export-format">Export Format</Label>
                  <Select value={exportFormat} onValueChange={(value) => setExportFormat(value as ExportFormat)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="json">
                        <div className="flex items-center gap-2">
                          <Code className="w-4 h-4" />
                          JSON
                        </div>
                      </SelectItem>
                      <SelectItem value="csv">
                        <div className="flex items-center gap-2">
                          <Table className="w-4 h-4" />
                          CSV
                        </div>
                      </SelectItem>
                      <SelectItem value="markdown">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          Markdown
                        </div>
                      </SelectItem>
                      <SelectItem value="trello">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          Trello
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Data Summary</Label>
                  <div className="flex flex-wrap gap-2">
                    {organizations.length > 0 && (
                      <Badge variant="secondary">
                        {organizations.length} Organizations
                      </Badge>
                    )}
                    {projects.length > 0 && (
                      <Badge variant="secondary">
                        {projects.length} Projects
                      </Badge>
                    )}
                    {tasks.length > 0 && (
                      <Badge variant="secondary">
                        {tasks.length} Tasks
                      </Badge>
                    )}
                    {labels.length > 0 && (
                      <Badge variant="secondary">
                        {labels.length} Labels
                      </Badge>
                    )}
                  </div>
                </div>
                
                {isProcessing && (
                  <div className="space-y-2">
                    <Label>Export Progress</Label>
                    <Progress value={progress} className="w-full" />
                  </div>
                )}
                
                <Button 
                  onClick={handleExport} 
                  disabled={isProcessing}
                  className="w-full"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Export Data
                    </>
                  )}
                </Button>
              </div>
            </Card>
          </TabsContent>
          
          {/* Import Tab */}
          <TabsContent value="import" className="space-y-6">
            <Card className="p-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="import-format">Import Format</Label>
                  <Select value={importFormat} onValueChange={(value) => setImportFormat(value as ImportFormat)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="trello">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          Trello JSON
                        </div>
                      </SelectItem>
                      <SelectItem value="csv">
                        <div className="flex items-center gap-2">
                          <Table className="w-4 h-4" />
                          CSV
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {importFormat === 'csv' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>CSV Field Mapping</Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowMapping(!showMapping)}
                      >
                        <Settings className="w-4 h-4" />
                        {showMapping ? 'Hide' : 'Configure'} Mapping
                      </Button>
                    </div>
                    
                    {showMapping && (
                      <div className="space-y-3 p-4 border rounded-lg">
                        <div className="text-sm text-gray-600">
                          Map CSV columns to Foco fields
                        </div>
                        
                        {Object.entries(csvMapping).map(([csvField, focoField]) => (
                          <div key={csvField} className="flex items-center gap-2">
                            <Badge variant="outline">{csvField}</Badge>
                            <span>→</span>
                            <Select
                              value={focoField}
                              onValueChange={(value) => handleMappingChange(csvField, value)}
                            >
                              <SelectTrigger className="w-40">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {focoFields.map(field => (
                                  <SelectItem key={field.value} value={field.value}>
                                    {field.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeMapping(csvField)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                        
                        <div className="flex items-center gap-2">
                          <Select
                            value=""
                            onValueChange={(value) => {
                              if (value) {
                                const csvField = prompt('Enter CSV column name:')
                                if (csvField) {
                                  handleMappingChange(csvField, value)
                                }
                              }
                            }}
                          >
                            <SelectTrigger className="w-40">
                              <SelectValue placeholder="Add mapping..." />
                            </SelectTrigger>
                            <SelectContent>
                              {focoFields.map(field => (
                                <SelectItem key={field.value} value={field.value}>
                                  {field.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {isProcessing && (
                  <div className="space-y-2">
                    <Label>Import Progress</Label>
                    <Progress value={progress} className="w-full" />
                  </div>
                )}
                
                {importResult && (
                  <div className="space-y-3">
                    <Label>Import Results</Label>
                    
                    {importResult.success ? (
                      <Alert>
                        <CheckCircle className="h-4 w-4" />
                        <AlertDescription>
                          Import completed successfully!
                          <div className="mt-2 flex flex-wrap gap-2">
                            {importResult.imported.organizations > 0 && (
                              <Badge variant="secondary">
                                {importResult.imported.organizations} Organizations
                              </Badge>
                            )}
                            {importResult.imported.projects > 0 && (
                              <Badge variant="secondary">
                                {importResult.imported.projects} Projects
                              </Badge>
                            )}
                            {importResult.imported.tasks > 0 && (
                              <Badge variant="secondary">
                                {importResult.imported.tasks} Tasks
                              </Badge>
                            )}
                            {importResult.imported.labels > 0 && (
                              <Badge variant="secondary">
                                {importResult.imported.labels} Labels
                              </Badge>
                            )}
                          </div>
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          Import failed with errors:
                          <ul className="mt-2 list-disc list-inside">
                            {importResult.errors.map((error, index) => (
                              <li key={index}>{error}</li>
                            ))}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    {importResult.warnings.length > 0 && (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          Warnings:
                          <ul className="mt-2 list-disc list-inside">
                            {importResult.warnings.map((warning, index) => (
                              <li key={index}>{warning}</li>
                            ))}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
                
                <Button 
                  onClick={handleImport} 
                  disabled={isProcessing}
                  className="w-full"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Import Data
                    </>
                  )}
                </Button>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
