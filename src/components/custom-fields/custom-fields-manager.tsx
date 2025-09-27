'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Plus,
  Edit,
  Trash2,
  Settings,
  Type,
  Hash,
  Calendar,
  CheckSquare,
  List,
  Globe,
  Mail,
  Save,
  X,
  AlertTriangle,
  CheckCircle
} from 'lucide-react'
import {
  CustomFieldDefinition,
  FieldType,
  FieldValidation,
  CustomFieldModel
} from '@/lib/models/custom-fields'
import { cn } from '@/lib/utils'

interface CustomFieldsManagerProps {
  organizationId: string
  currentUserRole?: string
  className?: string
}

const FIELD_TYPE_OPTIONS = [
  { value: 'text', label: 'Text', icon: Type, description: 'Single line text input' },
  { value: 'number', label: 'Number', icon: Hash, description: 'Numeric values' },
  { value: 'date', label: 'Date', icon: Calendar, description: 'Date picker' },
  { value: 'datetime', label: 'Date & Time', icon: Calendar, description: 'Date and time picker' },
  { value: 'boolean', label: 'Yes/No', icon: CheckSquare, description: 'True/false checkbox' },
  { value: 'select', label: 'Dropdown', icon: List, description: 'Single selection from options' },
  { value: 'multiselect', label: 'Multi-select', icon: List, description: 'Multiple selections from options' },
  { value: 'url', label: 'URL', icon: Globe, description: 'Web address' },
  { value: 'email', label: 'Email', icon: Mail, description: 'Email address' }
]

const ENTITY_TYPE_OPTIONS = [
  { value: 'project', label: 'Projects' },
  { value: 'milestone', label: 'Milestones' },
  { value: 'task', label: 'Tasks' },
  { value: 'organization', label: 'Organization' }
]

export default function CustomFieldsManager({
  organizationId,
  currentUserRole = 'member',
  className
}: CustomFieldsManagerProps) {
  const [fields, setFields] = useState<CustomFieldDefinition[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateField, setShowCreateField] = useState(false)
  const [editingField, setEditingField] = useState<CustomFieldDefinition | null>(null)
  const [selectedEntityType, setSelectedEntityType] = useState<'project' | 'milestone' | 'task' | 'organization'>('project')

  // Form state
  const [fieldName, setFieldName] = useState('')
  const [fieldKey, setFieldKey] = useState('')
  const [fieldType, setFieldType] = useState<FieldType>('text')
  const [fieldDescription, setFieldDescription] = useState('')
  const [isRequired, setIsRequired] = useState(false)
  const [defaultValue, setDefaultValue] = useState('')
  const [selectOptions, setSelectOptions] = useState<string[]>([])
  const [validationRules, setValidationRules] = useState<FieldValidation[]>([])

  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    loadFields()
  }, [organizationId])

  const loadFields = async () => {
    try {
      setIsLoading(true)
      // TODO: Load fields from API
      // For now, show empty state
      setFields([])
    } catch (error) {
      console.error('Failed to load custom fields:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setFieldName('')
    setFieldKey('')
    setFieldType('text')
    setFieldDescription('')
    setIsRequired(false)
    setDefaultValue('')
    setSelectOptions([])
    setValidationRules([])
    setValidationErrors([])
    setEditingField(null)
  }

  const handleCreateField = () => {
    const fieldData: Partial<CustomFieldDefinition> = {
      name: fieldName.trim(),
      key: fieldKey.trim(),
      type: fieldType,
      description: fieldDescription.trim(),
      entity_type: selectedEntityType,
      organization_id: organizationId,
      is_required: isRequired,
      is_system: false,
      default_value: defaultValue || undefined,
      options: (fieldType === 'select' || fieldType === 'multiselect') ? selectOptions : undefined,
      validation_rules: validationRules,
      display_order: fields.length,
      is_active: true
    }

    const validation = CustomFieldModel.validateFieldDefinition(fieldData)
    if (!validation.isValid) {
      setValidationErrors(validation.errors)
      return
    }

    setValidationErrors([])
    setIsSaving(true)

    try {
      // TODO: Save field to API
      const newField: CustomFieldDefinition = {
        ...fieldData,
        id: `field_${Date.now()}`,
        created_by: 'current_user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as CustomFieldDefinition

      setFields(prev => [...prev, newField])
      setShowCreateField(false)
      resetForm()
    } catch (error) {
      console.error('Failed to create field:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleEditField = (field: CustomFieldDefinition) => {
    setEditingField(field)
    setFieldName(field.name)
    setFieldKey(field.key)
    setFieldType(field.type)
    setFieldDescription(field.description || '')
    setIsRequired(field.is_required)
    setDefaultValue(field.default_value || '')
    setSelectOptions(field.options || [])
    setValidationRules(field.validation_rules || [])
    setSelectedEntityType(field.entity_type)
    setShowCreateField(true)
  }

  const handleUpdateField = () => {
    if (!editingField) return

    const fieldData: Partial<CustomFieldDefinition> = {
      ...editingField,
      name: fieldName.trim(),
      key: fieldKey.trim(),
      type: fieldType,
      description: fieldDescription.trim(),
      is_required: isRequired,
      default_value: defaultValue || undefined,
      options: (fieldType === 'select' || fieldType === 'multiselect') ? selectOptions : undefined,
      validation_rules: validationRules,
      updated_at: new Date().toISOString()
    }

    const validation = CustomFieldModel.validateFieldDefinition(fieldData)
    if (!validation.isValid) {
      setValidationErrors(validation.errors)
      return
    }

    setValidationErrors([])
    setIsSaving(true)

    try {
      // TODO: Update field via API
      setFields(prev => prev.map(f => f.id === editingField.id ? fieldData as CustomFieldDefinition : f))
      setShowCreateField(false)
      resetForm()
    } catch (error) {
      console.error('Failed to update field:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteField = async (fieldId: string) => {
    const field = fields.find(f => f.id === fieldId)
    if (field?.is_system) {
      alert('Cannot delete system fields')
      return
    }

    if (!confirm('Are you sure you want to delete this custom field? This action cannot be undone.')) {
      return
    }

    try {
      // TODO: Delete field via API
      setFields(prev => prev.filter(f => f.id !== fieldId))
    } catch (error) {
      console.error('Failed to delete field:', error)
    }
  }

  const addValidationRule = () => {
    setValidationRules(prev => [...prev, { type: 'required' }])
  }

  const removeValidationRule = (index: number) => {
    setValidationRules(prev => prev.filter((_, i) => i !== index))
  }

  const updateValidationRule = (index: number, rule: FieldValidation) => {
    setValidationRules(prev => prev.map((r, i) => i === index ? rule : r))
  }

  const addSelectOption = () => {
    setSelectOptions(prev => [...prev, ''])
  }

  const updateSelectOption = (index: number, value: string) => {
    setSelectOptions(prev => prev.map((opt, i) => i === index ? value : opt))
  }

  const removeSelectOption = (index: number) => {
    setSelectOptions(prev => prev.filter((_, i) => i !== index))
  }

  const filteredFields = fields.filter(field => field.entity_type === selectedEntityType)
  const canManageFields = currentUserRole === 'director' || currentUserRole === 'lead'

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="animate-pulse space-y-4 w-full">
            <div className="h-6 bg-muted rounded w-48"></div>
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="w-6 h-6" />
            Custom Fields
          </h2>
          <p className="text-muted-foreground mt-1">
            Create custom fields for projects, milestones, and tasks
          </p>
        </div>

        {canManageFields && (
          <Dialog open={showCreateField} onOpenChange={setShowCreateField}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="w-4 h-4 mr-2" />
                Add Field
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingField ? 'Edit Custom Field' : 'Create Custom Field'}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="field-name">Field Name</Label>
                    <Input
                      id="field-name"
                      placeholder="e.g., Budget, Priority Score"
                      value={fieldName}
                      onChange={(e) => setFieldName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="field-key">Field Key</Label>
                    <Input
                      id="field-key"
                      placeholder="e.g., budget, priority_score"
                      value={fieldKey}
                      onChange={(e) => setFieldKey(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Machine-readable identifier
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Description (Optional)</Label>
                  <Textarea
                    placeholder="Describe what this field is used for"
                    value={fieldDescription}
                    onChange={(e) => setFieldDescription(e.target.value)}
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Field Type</Label>
                    <Select value={fieldType} onValueChange={(value) => setFieldType(value as FieldType)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FIELD_TYPE_OPTIONS.map(type => {
                          const IconComponent = type.icon
                          return (
                            <SelectItem key={type.value} value={type.value}>
                              <div className="flex items-center gap-2">
                                <IconComponent className="w-4 h-4" />
                                <div>
                                  <div className="font-medium">{type.label}</div>
                                  <div className="text-xs text-muted-foreground">{type.description}</div>
                                </div>
                              </div>
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Entity Type</Label>
                    <Select value={selectedEntityType} onValueChange={(value) => setSelectedEntityType(value as any)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ENTITY_TYPE_OPTIONS.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="required"
                    checked={isRequired}
                    onCheckedChange={(checked) => setIsRequired(checked as boolean)}
                  />
                  <Label htmlFor="required">Required field</Label>
                </div>

                {/* Select Options */}
                {(fieldType === 'select' || fieldType === 'multiselect') && (
                  <div className="space-y-3">
                    <Label>Select Options</Label>
                    {selectOptions.map((option, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          placeholder={`Option ${index + 1}`}
                          value={option}
                          onChange={(e) => updateSelectOption(index, e.target.value)}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeSelectOption(index)}
                          className="px-2"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    <Button variant="outline" onClick={addSelectOption} size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Option
                    </Button>
                  </div>
                )}

                {/* Default Value */}
                <div className="space-y-2">
                  <Label>Default Value (Optional)</Label>
                  <Input
                    placeholder="Default value for this field"
                    value={defaultValue}
                    onChange={(e) => setDefaultValue(e.target.value)}
                  />
                </div>

                {/* Validation Rules */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Validation Rules</Label>
                    <Button variant="outline" onClick={addValidationRule} size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Rule
                    </Button>
                  </div>

                  {validationRules.map((rule, index) => (
                    <div key={index} className="flex gap-2 items-start p-3 border rounded">
                      <Select
                        value={rule.type}
                        onValueChange={(value) => updateValidationRule(index, { ...rule, type: value as any })}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="required">Required</SelectItem>
                          <SelectItem value="min_length">Min Length</SelectItem>
                          <SelectItem value="max_length">Max Length</SelectItem>
                          <SelectItem value="min_value">Min Value</SelectItem>
                          <SelectItem value="max_value">Max Value</SelectItem>
                          <SelectItem value="pattern">Pattern</SelectItem>
                        </SelectContent>
                      </Select>

                      {rule.type !== 'required' && (
                        <Input
                          placeholder="Value"
                          value={rule.value || ''}
                          onChange={(e) => updateValidationRule(index, { ...rule, value: e.target.value })}
                          className="flex-1"
                        />
                      )}

                      <Input
                        placeholder="Error message"
                        value={rule.message || ''}
                        onChange={(e) => updateValidationRule(index, { ...rule, message: e.target.value })}
                        className="flex-1"
                      />

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeValidationRule(index)}
                        className="px-2"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Validation Errors */}
                <AnimatePresence>
                  {validationErrors.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <ul className="list-disc list-inside">
                            {validationErrors.map((error, index) => (
                              <li key={index}>{error}</li>
                            ))}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCreateField(false)
                      resetForm()
                    }}
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={editingField ? handleUpdateField : handleCreateField}
                    disabled={!fieldName.trim() || !fieldKey.trim() || isSaving}
                  >
                    {isSaving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        {editingField ? 'Update Field' : 'Create Field'}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Tabs value={selectedEntityType} onValueChange={(value) => setSelectedEntityType(value as any)}>
        <TabsList className="grid w-full grid-cols-4">
          {ENTITY_TYPE_OPTIONS.map(type => (
            <TabsTrigger key={type.value} value={type.value} className="text-xs">
              {type.label} ({fields.filter(f => f.entity_type === type.value).length})
            </TabsTrigger>
          ))}
        </TabsList>

        {ENTITY_TYPE_OPTIONS.map(entityType => (
          <TabsContent key={entityType.value} value={entityType.value}>
            <Card>
              <CardHeader>
                <CardTitle>Custom Fields for {entityType.label}</CardTitle>
              </CardHeader>
              <CardContent>
                {filteredFields.length === 0 ? (
                  <div className="text-center py-12">
                    <Settings className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No custom fields yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Create custom fields to capture additional information for {entityType.label.toLowerCase()}.
                    </p>
                    {canManageFields && (
                      <Button onClick={() => setShowCreateField(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Create First Field
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredFields.map((field) => {
                      const typeOption = FIELD_TYPE_OPTIONS.find(t => t.value === field.type)
                      const IconComponent = typeOption?.icon || Type

                      return (
                        <div key={field.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-muted rounded">
                              <IconComponent className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{field.name}</span>
                                <span className="text-sm text-muted-foreground">({field.key})</span>
                                {field.is_required && (
                                  <Badge variant="destructive" className="text-xs">Required</Badge>
                                )}
                                {field.is_system && (
                                  <Badge variant="outline" className="text-xs">System</Badge>
                                )}
                              </div>
                              {field.description && (
                                <p className="text-sm text-muted-foreground">{field.description}</p>
                              )}
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="secondary" className="text-xs">
                                  {typeOption?.label || field.type}
                                </Badge>
                                {field.options && (
                                  <span className="text-xs text-muted-foreground">
                                    {field.options.length} options
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {canManageFields && (
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditField(field)}
                                disabled={field.is_system}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteField(field.id)}
                                disabled={field.is_system}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}


