'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@//components/ui/tabs'
import {
  Filter,
  Plus,
  X,
  Search,
  Save,
  Trash2,
  SortAsc,
  SortDesc,
  Calendar,
  Hash,
  Type,
  CheckSquare,
  List
} from 'lucide-react'
import { FilteringService, FilterCondition, SortCondition, FilterOperator } from '@/lib/services/filtering'
import { cn } from '@/lib/utils'

interface FieldDefinition {
  key: string
  label: string
  type: 'string' | 'number' | 'date' | 'boolean' | 'array'
  options?: string[] // For select fields
}

interface AdvancedFilterBuilderProps {
  fields: FieldDefinition[]
  currentFilters: FilterCondition[]
  currentSort: SortCondition[]
  onFiltersChange: (filters: FilterCondition[]) => void
  onSortChange: (sort: SortCondition[]) => void
  onSaveFilter?: (name: string, filters: FilterCondition[], sort: SortCondition[]) => void
  savedFilters?: Array<{
    id: string
    name: string
    conditions: FilterCondition[]
    sortConditions: SortCondition[]
  }>
  onLoadFilter?: (filterId: string) => void
  className?: string
}

export default function AdvancedFilterBuilder({
  fields,
  currentFilters,
  currentSort,
  onFiltersChange,
  onSortChange,
  onSaveFilter,
  savedFilters = [],
  onLoadFilter,
  className
}: AdvancedFilterBuilderProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'filters' | 'sort'>('filters')
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [saveFilterName, setSaveFilterName] = useState('')
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  // Filter builder state
  const [selectedField, setSelectedField] = useState<string>('')
  const [selectedOperator, setSelectedOperator] = useState<FilterOperator>('equals')
  const [filterValue, setFilterValue] = useState<any>('')
  const [caseSensitive, setCaseSensitive] = useState(false)

  // Sort builder state
  const [sortField, setSortField] = useState<string>('')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  const handleAddFilter = () => {
    if (!selectedField || !selectedOperator) return

    const newCondition: FilterCondition = {
      field: selectedField,
      operator: selectedOperator,
      value: filterValue,
      caseSensitive: caseSensitive && ['contains', 'not_contains', 'starts_with', 'ends_with'].includes(selectedOperator)
    }

    const validation = FilteringService.validateConditions([newCondition])
    if (!validation.isValid) {
      setValidationErrors(validation.errors)
      return
    }

    setValidationErrors([])
    onFiltersChange([...currentFilters, newCondition])

    // Reset form
    setSelectedField('')
    setSelectedOperator('equals')
    setFilterValue('')
    setCaseSensitive(false)
  }

  const handleRemoveFilter = (index: number) => {
    const newFilters = currentFilters.filter((_, i) => i !== index)
    onFiltersChange(newFilters)
  }

  const handleAddSort = () => {
    if (!sortField) return

    const newSort: SortCondition = {
      field: sortField,
      direction: sortDirection
    }

    // Remove existing sort for this field
    const filteredSort = currentSort.filter(s => s.field !== sortField)
    onSortChange([...filteredSort, newSort])

    // Reset form
    setSortField('')
    setSortDirection('asc')
  }

  const handleRemoveSort = (field: string) => {
    const newSort = currentSort.filter(s => s.field !== field)
    onSortChange(newSort)
  }

  const handleSaveFilter = () => {
    if (!saveFilterName.trim()) return

    onSaveFilter?.(saveFilterName.trim(), currentFilters, currentSort)
    setSaveFilterName('')
    setShowSaveDialog(false)
  }

  const handleLoadFilter = (filterId: string) => {
    onLoadFilter?.(filterId)
    setIsOpen(false)
  }

  const getFieldType = (fieldKey: string) => {
    return fields.find(f => f.key === fieldKey)?.type || 'string'
  }

  const getFieldLabel = (fieldKey: string) => {
    return fields.find(f => f.key === fieldKey)?.label || fieldKey
  }

  const getOperatorsForField = (fieldKey: string) => {
    const fieldType = getFieldType(fieldKey)
    return FilteringService.getOperatorsForField(fieldType)
  }

  const getFieldIcon = (type: string) => {
    switch (type) {
      case 'string': return <Type className="w-4 h-4" />
      case 'number': return <Hash className="w-4 h-4" />
      case 'date': return <Calendar className="w-4 h-4" />
      case 'boolean': return <CheckSquare className="w-4 h-4" />
      case 'array': return <List className="w-4 h-4" />
      default: return <Type className="w-4 h-4" />
    }
  }

  const renderFilterValueInput = () => {
    if (!selectedField) return null

    const field = fields.find(f => f.key === selectedField)
    if (!field) return null

    switch (selectedOperator) {
      case 'between':
        return (
          <div className="flex gap-2">
            <Input
              placeholder="Start value"
              value={Array.isArray(filterValue) ? filterValue[0] || '' : ''}
              onChange={(e) => {
                const current = Array.isArray(filterValue) ? filterValue : ['', '']
                setFilterValue([e.target.value, current[1]])
              }}
            />
            <Input
              placeholder="End value"
              value={Array.isArray(filterValue) ? filterValue[1] || '' : ''}
              onChange={(e) => {
                const current = Array.isArray(filterValue) ? filterValue : ['', '']
                setFilterValue([current[0], e.target.value])
              }}
            />
          </div>
        )

      case 'in':
      case 'not_in':
        return (
          <Input
            placeholder="Comma-separated values"
            value={Array.isArray(filterValue) ? filterValue.join(', ') : (typeof filterValue === 'string' ? filterValue : '')}
            onChange={(e) => {
              const inputValue = e.target.value;
              // Parse to array for the filter value, but keep the raw input for display
              const parsedArray = inputValue.split(',').map(s => s.trim()).filter(s => s);
              setFilterValue(parsedArray.length > 0 ? parsedArray : inputValue);
            }}
          />
        )

      case 'is_empty':
      case 'is_not_empty':
        return null // No input needed

      default:
        if (field.options) {
          return (
            <Select value={filterValue} onValueChange={setFilterValue}>
              <SelectTrigger>
                <SelectValue placeholder="Select value" />
              </SelectTrigger>
              <SelectContent>
                {field.options.map(option => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )
        }

        return (
          <Input
            type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
            placeholder="Enter value"
            value={filterValue}
            onChange={(e) => setFilterValue(e.target.value)}
          />
        )
    }
  }

  const getOperatorLabel = (operator: FilterOperator) => {
    const labels: Record<FilterOperator, string> = {
      equals: 'Equals',
      not_equals: 'Not Equals',
      contains: 'Contains',
      not_contains: 'Does Not Contain',
      starts_with: 'Starts With',
      ends_with: 'Ends With',
      greater_than: 'Greater Than',
      less_than: 'Less Than',
      between: 'Between',
      in: 'In',
      not_in: 'Not In',
      is_empty: 'Is Empty',
      is_not_empty: 'Is Not Empty'
    }
    return labels[operator]
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className={cn('gap-2', className)}>
          <Filter className="w-4 h-4" />
          Advanced Filters
          {(currentFilters.length > 0 || currentSort.length > 0) && (
            <Badge variant="secondary" className="ml-2">
              {currentFilters.length + currentSort.length}
            </Badge>
          )}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Advanced Filtering & Sorting
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col h-[70vh]">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'filters' | 'sort')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="filters" className="flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Filters ({currentFilters.length})
              </TabsTrigger>
              <TabsTrigger value="sort" className="flex items-center gap-2">
                <SortAsc className="w-4 h-4" />
                Sort ({currentSort.length})
              </TabsTrigger>
            </TabsList>

            {/* Filters Tab */}
            <TabsContent value="filters" className="flex-1 overflow-hidden flex flex-col">
              <div className="flex-1 overflow-y-auto">
                {/* Current Filters */}
                <div className="space-y-3 mb-6">
                  <h3 className="font-medium">Active Filters</h3>
                  {currentFilters.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No filters applied</p>
                  ) : (
                    <div className="space-y-2">
                      {currentFilters.map((filter, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded">
                          <Badge variant="outline">
                            {getFieldLabel(filter.field)}
                          </Badge>
                          <span className="text-sm font-medium">{getOperatorLabel(filter.operator)}</span>
                          {filter.operator !== 'is_empty' && filter.operator !== 'is_not_empty' && (
                            <Badge variant="secondary">
                              {Array.isArray(filter.value) ? filter.value.join(', ') : String(filter.value)}
                            </Badge>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveFilter(index)}
                            className="ml-auto h-6 w-6 p-0"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add Filter Form */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Add Filter Condition</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Field</Label>
                        <Select value={selectedField} onValueChange={setSelectedField}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select field" />
                          </SelectTrigger>
                          <SelectContent>
                            {fields.map(field => (
                              <SelectItem key={field.key} value={field.key}>
                                <div className="flex items-center gap-2">
                                  {getFieldIcon(field.type)}
                                  {field.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Operator</Label>
                        <Select
                          value={selectedOperator}
                          onValueChange={(value) => setSelectedOperator(value as FilterOperator)}
                          disabled={!selectedField}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select operator" />
                          </SelectTrigger>
                          <SelectContent>
                            {selectedField && getOperatorsForField(selectedField).map(operator => (
                              <SelectItem key={operator} value={operator}>
                                {getOperatorLabel(operator)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Value</Label>
                        {renderFilterValueInput()}
                      </div>
                    </div>

                    {/* Case Sensitive Option */}
                    {selectedField && ['contains', 'not_contains', 'starts_with', 'ends_with'].includes(selectedOperator) && (
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="case-sensitive"
                          checked={caseSensitive}
                          onCheckedChange={(checked) => setCaseSensitive(checked as boolean)}
                        />
                        <Label htmlFor="case-sensitive" className="text-sm">
                          Case sensitive
                        </Label>
                      </div>
                    )}

                    {/* Validation Errors */}
                    <AnimatePresence>
                      {validationErrors.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                        >
                          <Alert variant="destructive">
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

                    <Button onClick={handleAddFilter} disabled={!selectedField || !selectedOperator}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Filter
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Sort Tab */}
            <TabsContent value="sort" className="flex-1 overflow-hidden flex flex-col">
              <div className="flex-1 overflow-y-auto">
                {/* Current Sort */}
                <div className="space-y-3 mb-6">
                  <h3 className="font-medium">Active Sort</h3>
                  {currentSort.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No sorting applied</p>
                  ) : (
                    <div className="space-y-2">
                      {currentSort.map((sort) => (
                        <div key={sort.field} className="flex items-center gap-2 p-2 bg-muted rounded">
                          <Badge variant="outline">
                            {getFieldLabel(sort.field)}
                          </Badge>
                          <div className="flex items-center gap-1">
                            {sort.direction === 'asc' ? (
                              <SortAsc className="w-3 h-3" />
                            ) : (
                              <SortDesc className="w-3 h-3" />
                            )}
                            <span className="text-sm capitalize">{sort.direction}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveSort(sort.field)}
                            className="ml-auto h-6 w-6 p-0"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add Sort Form */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Add Sort Condition</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Field</Label>
                        <Select value={sortField} onValueChange={setSortField}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select field" />
                          </SelectTrigger>
                          <SelectContent>
                            {fields.map(field => (
                              <SelectItem key={field.key} value={field.key}>
                                <div className="flex items-center gap-2">
                                  {getFieldIcon(field.type)}
                                  {field.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Direction</Label>
                        <Select value={sortDirection} onValueChange={(value) => setSortDirection(value as 'asc' | 'desc')}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="asc">
                              <div className="flex items-center gap-2">
                                <SortAsc className="w-4 h-4" />
                                Ascending
                              </div>
                            </SelectItem>
                            <SelectItem value="desc">
                              <div className="flex items-center gap-2">
                                <SortDesc className="w-4 h-4" />
                                Descending
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Button onClick={handleAddSort} disabled={!sortField}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Sort
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex gap-2">
              {onSaveFilter && (
                <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Save className="w-4 h-4 mr-2" />
                      Save Filter
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Save Filter Configuration</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="filter-name">Filter Name</Label>
                        <Input
                          id="filter-name"
                          placeholder="Enter filter name"
                          value={saveFilterName}
                          onChange={(e) => setSaveFilterName(e.target.value)}
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleSaveFilter} disabled={!saveFilterName.trim()}>
                          Save
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}

              {savedFilters.length > 0 && onLoadFilter && (
                <Select onValueChange={handleLoadFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Load saved filter" />
                  </SelectTrigger>
                  <SelectContent>
                    {savedFilters.map(filter => (
                      <SelectItem key={filter.id} value={filter.id}>
                        {filter.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  onFiltersChange([])
                  onSortChange([])
                }}
                disabled={currentFilters.length === 0 && currentSort.length === 0}
              >
                Clear All
              </Button>
              <Button onClick={() => setIsOpen(false)}>
                Apply Filters ({currentFilters.length + currentSort.length})
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}


