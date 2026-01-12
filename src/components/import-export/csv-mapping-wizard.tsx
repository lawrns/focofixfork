'use client'

import { useState, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle, 
  AlertCircle, 
  FileText,
  Table,
  ArrowRight,
  X
} from 'lucide-react'
import { CSVMapping } from '@/lib/utils/import-export'

interface CSVMappingWizardProps {
  csvHeaders: string[]
  onMappingComplete: (mapping: CSVMapping) => void
  onCancel: () => void
}

interface MappingStep {
  csvField: string
  focoField: string
  required: boolean
  description: string
}

const FocoFields = [
  { value: 'name', label: 'Project Name', description: 'The name of the project', required: true },
  { value: 'title', label: 'Task Title', description: 'The title of the task', required: true },
  { value: 'description', label: 'Description', description: 'Detailed description', required: false },
  { value: 'status', label: 'Status', description: 'Current status (todo, in_progress, completed)', required: false },
  { value: 'priority', label: 'Priority', description: 'Priority level (low, normal, high, urgent)', required: false },
  { value: 'due_date', label: 'Due Date', description: 'Due date in YYYY-MM-DD format', required: false },
  { value: 'project_id', label: 'Project ID', description: 'ID of the parent project', required: false },
  { value: 'assignee_id', label: 'Assignee ID', description: 'ID of the assigned user', required: false },
  { value: 'created_at', label: 'Created At', description: 'Creation timestamp', required: false },
  { value: 'updated_at', label: 'Updated At', description: 'Last update timestamp', required: false }
]

export function CSVMappingWizard({ csvHeaders, onMappingComplete, onCancel }: CSVMappingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [mappings, setMappings] = useState<CSVMapping>({})
  const [autoMappings, setAutoMappings] = useState<CSVMapping>({})
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Auto-detect mappings based on field names
  useEffect(() => {
    const autoDetected: CSVMapping = {}
    
    csvHeaders.forEach(header => {
      const lowerHeader = header.toLowerCase().replace(/[^a-z0-9]/g, '')
      
      // Try to match common patterns
      if (lowerHeader.includes('name') || lowerHeader.includes('title')) {
        if (lowerHeader.includes('project')) {
          autoDetected[header] = 'name'
        } else if (lowerHeader.includes('task')) {
          autoDetected[header] = 'title'
        } else {
          // Default to title for generic name/title fields
          autoDetected[header] = 'title'
        }
      } else if (lowerHeader.includes('description') || lowerHeader.includes('desc')) {
        autoDetected[header] = 'description'
      } else if (lowerHeader.includes('status') || lowerHeader.includes('state')) {
        autoDetected[header] = 'status'
      } else if (lowerHeader.includes('priority')) {
        autoDetected[header] = 'priority'
      } else if (lowerHeader.includes('due') || lowerHeader.includes('deadline')) {
        autoDetected[header] = 'due_date'
      } else if (lowerHeader.includes('project') && lowerHeader.includes('id')) {
        autoDetected[header] = 'project_id'
      } else if (lowerHeader.includes('assignee') || lowerHeader.includes('owner')) {
        autoDetected[header] = 'assignee_id'
      } else if (lowerHeader.includes('created') || lowerHeader.includes('date')) {
        autoDetected[header] = 'created_at'
      }
    })
    
    setAutoMappings(autoDetected)
    setMappings(autoDetected)
  }, [csvHeaders])

  const handleMappingChange = useCallback((csvField: string, focoField: string) => {
    setMappings(prev => ({
      ...prev,
      [csvField]: focoField
    }))
  }, [])

  const removeMapping = useCallback((csvField: string) => {
    setMappings(prev => {
      const newMappings = { ...prev }
      delete newMappings[csvField]
      return newMappings
    })
  }, [])

  const handleNext = useCallback(() => {
    if (currentStep < csvHeaders.length - 1) {
      setCurrentStep(prev => prev + 1)
    } else {
      // Complete mapping
      onMappingComplete(mappings)
    }
  }, [currentStep, csvHeaders.length, mappings, onMappingComplete])

  const handlePrevious = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }, [currentStep])

  const handleSkip = useCallback(() => {
    if (currentStep < csvHeaders.length - 1) {
      setCurrentStep(prev => prev + 1)
    } else {
      onMappingComplete(mappings)
    }
  }, [currentStep, csvHeaders.length, mappings, onMappingComplete])

  const currentHeader = csvHeaders[currentStep]
  const currentMapping = mappings[currentHeader]
  const isRequired = FocoFields.find(f => f.value === currentMapping)?.required || false

  return (
    <Dialog open={true} onOpenChange={() => onCancel()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Table className="w-5 h-5" />
            CSV Field Mapping Wizard
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Step {currentStep + 1} of {csvHeaders.length}</span>
              <span>{Math.round(((currentStep + 1) / csvHeaders.length) * 100)}% Complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentStep + 1) / csvHeaders.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Current Field Mapping */}
          <Card className="p-6">
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Map CSV Field</h3>
                <Badge variant="outline" className="text-lg px-4 py-2">
                  {currentHeader}
                </Badge>
              </div>
              
              <div className="flex items-center justify-center gap-4">
                <div className="text-center">
                  <Label className="text-sm text-gray-600">CSV Column</Label>
                  <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                    <FileText className="w-6 h-6 mx-auto text-gray-400" />
                    <div className="text-sm font-medium mt-1">{currentHeader}</div>
                  </div>
                </div>
                
                <ArrowRight className="w-6 h-6 text-gray-400" />
                
                <div className="text-center">
                  <Label className="text-sm text-gray-600">Foco Field</Label>
                  <Select
                    value={currentMapping || ''}
                    onValueChange={(value) => handleMappingChange(currentHeader, value)}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Select field..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        <div className="flex items-center gap-2">
                          <X className="w-4 h-4 text-gray-400" />
                          Skip this field
                        </div>
                      </SelectItem>
                      {FocoFields.map(field => (
                        <SelectItem key={field.value} value={field.value}>
                          <div className="flex items-center gap-2">
                            {field.required && <CheckCircle className="w-4 h-4 text-green-500" />}
                            <span>{field.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {currentMapping && (
                <div className="text-center">
                  <p className="text-sm text-gray-600">
                    {FocoFields.find(f => f.value === currentMapping)?.description}
                  </p>
                  {isRequired && (
                    <Badge variant="secondary" className="mt-2">
                      Required Field
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </Card>

          {/* Advanced Mapping View */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>All Mappings</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                {showAdvanced ? 'Hide' : 'Show'} All
              </Button>
            </div>
            
            {showAdvanced && (
              <Card className="p-4">
                <div className="space-y-2">
                  {csvHeaders.map(header => (
                    <div key={header} className="flex items-center gap-2">
                      <Badge 
                        variant={header === currentHeader ? "default" : "outline"}
                        className="min-w-[120px] justify-center"
                      >
                        {header}
                      </Badge>
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                      <Select
                        value={mappings[header] || ''}
                        onValueChange={(value) => handleMappingChange(header, value)}
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Select field..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">
                            <div className="flex items-center gap-2">
                              <X className="w-4 h-4 text-gray-400" />
                              Skip
                            </div>
                          </SelectItem>
                          {FocoFields.map(field => (
                            <SelectItem key={field.value} value={field.value}>
                              {field.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {mappings[header] && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMapping(header)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* Validation */}
          {Object.keys(mappings).length === 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No fields have been mapped yet. At least one field is required for import.
              </AlertDescription>
            </Alert>
          )}

          {/* Navigation */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleSkip}
              >
                Skip
              </Button>
              
              <Button
                onClick={handleNext}
                disabled={Object.keys(mappings).length === 0}
              >
                {currentStep === csvHeaders.length - 1 ? (
                  <>
                    Complete
                    <CheckCircle className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
