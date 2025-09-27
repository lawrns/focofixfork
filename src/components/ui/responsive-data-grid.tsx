'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, MoreHorizontal, Search, Filter, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface DataGridColumn<T> {
  key: keyof T
  header: string
  sortable?: boolean
  filterable?: boolean
  priority?: 'high' | 'medium' | 'low' // Display priority on mobile
  width?: string // Desktop column width
  render?: (value: any, row: T) => React.ReactNode
  className?: string
}

interface ResponsiveDataGridProps<T> {
  data: T[]
  columns: DataGridColumn<T>[]
  keyField: keyof T
  className?: string
  mobileBreakpoint?: number
  searchable?: boolean
  searchPlaceholder?: string
  onRowClick?: (row: T) => void
  actions?: (row: T) => React.ReactNode
  emptyMessage?: string
  loading?: boolean
  pagination?: {
    pageSize?: number
    showPagination?: boolean
  }
}

type SortDirection = 'asc' | 'desc' | null
type SortConfig = {
  key: string
  direction: SortDirection
}

export function ResponsiveDataGrid<T extends Record<string, any>>({
  data,
  columns,
  keyField,
  className,
  mobileBreakpoint = 768,
  searchable = true,
  searchPlaceholder = 'Search...',
  onRowClick,
  actions,
  emptyMessage = 'No data available',
  loading = false,
  pagination = { pageSize: 10, showPagination: true }
}: ResponsiveDataGridProps<T>) {
  const [isMobile, setIsMobile] = useState(false)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: '', direction: null })
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [filters, setFilters] = useState<Record<string, string>>({})

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < mobileBreakpoint)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [mobileBreakpoint])

  // Handle sorting
  const handleSort = (key: string) => {
    let direction: SortDirection = 'asc'

    if (sortConfig.key === key) {
      if (sortConfig.direction === 'asc') {
        direction = 'desc'
      } else if (sortConfig.direction === 'desc') {
        direction = null
      } else {
        direction = 'asc'
      }
    }

    setSortConfig({ key, direction })
  }

  // Handle filtering
  const handleFilter = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
    setCurrentPage(1) // Reset to first page when filtering
  }

  // Filter and search data
  const filteredData = React.useMemo(() => {
    let result = [...data]

    // Apply search
    if (searchTerm) {
      result = result.filter(row =>
        columns.some(column => {
          const value = row[column.key]
          return String(value).toLowerCase().includes(searchTerm.toLowerCase())
        })
      )
    }

    // Apply filters
    Object.entries(filters).forEach(([key, filterValue]) => {
      if (filterValue) {
        result = result.filter(row =>
          String(row[key]).toLowerCase().includes(filterValue.toLowerCase())
        )
      }
    })

    return result
  }, [data, searchTerm, filters, columns])

  // Sort filtered data
  const sortedData = React.useMemo(() => {
    if (!sortConfig.direction) return filteredData

    return [...filteredData].sort((a, b) => {
      const aValue = a[sortConfig.key]
      const bValue = b[sortConfig.key]

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })
  }, [filteredData, sortConfig])

  // Paginate data
  const paginatedData = React.useMemo(() => {
    if (!pagination.showPagination) return sortedData

    const startIndex = (currentPage - 1) * (pagination.pageSize || 10)
    const endIndex = startIndex + (pagination.pageSize || 10)
    return sortedData.slice(startIndex, endIndex)
  }, [sortedData, currentPage, pagination])

  // Get sort icon
  const getSortIcon = (columnKey: string) => {
    if (sortConfig.key !== columnKey) {
      return <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
    }

    switch (sortConfig.direction) {
      case 'asc':
        return <ArrowUp className="w-4 h-4 text-primary" />
      case 'desc':
        return <ArrowDown className="w-4 h-4 text-primary" />
      default:
        return <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
    }
  }

  // Toggle row expansion on mobile
  const toggleRowExpansion = (rowId: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(rowId)) {
      newExpanded.delete(rowId)
    } else {
      newExpanded.add(rowId)
    }
    setExpandedRows(newExpanded)
  }

  // Get priority columns for mobile
  const getPriorityColumns = () => {
    const sorted = [...columns].sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      const aPriority = priorityOrder[a.priority || 'medium']
      const bPriority = priorityOrder[b.priority || 'medium']
      return bPriority - aPriority
    })
    return sorted
  }

  const totalPages = Math.ceil(sortedData.length / (pagination.pageSize || 10))

  if (loading) {
    return (
      <div className={cn('w-full', className)}>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('w-full space-y-4', className)}>
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {searchable && (
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        )}

        {/* Filter inputs for filterable columns */}
        <div className="flex gap-2 overflow-x-auto">
          {columns.filter(col => col.filterable).map((column) => (
            <div key={String(column.key)} className="relative min-w-[150px]">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder={`Filter ${column.header}`}
                value={filters[String(column.key)] || ''}
                onChange={(e) => handleFilter(String(column.key), e.target.value)}
                className="pl-10 text-sm"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Data Display */}
      {paginatedData.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {emptyMessage}
        </div>
      ) : isMobile ? (
        // Mobile Card Layout
        <div className="space-y-4">
          {paginatedData.map((row, index) => {
            const rowId = String(row[keyField])
            const isExpanded = expandedRows.has(rowId)
            const priorityColumns = getPriorityColumns()

            return (
              <motion.div
                key={rowId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className={cn(
                  'bg-card border border-border rounded-lg shadow-sm overflow-hidden',
                  onRowClick && 'cursor-pointer hover:shadow-md transition-shadow'
                )}
                onClick={() => onRowClick?.(row)}
              >
                {/* Primary Content */}
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      {priorityColumns.slice(0, 2).map((column, colIndex) => (
                        <div key={String(column.key)} className={colIndex > 0 ? 'mt-2' : ''}>
                          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                            {column.header}
                          </div>
                          <div className="text-sm font-medium text-foreground">
                            {column.render
                              ? column.render(row[column.key], row)
                              : String(row[column.key] || '-')
                            }
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2 ml-3">
                      {actions && (
                        <div onClick={(e) => e.stopPropagation()}>
                          {actions(row)}
                        </div>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleRowExpansion(rowId)
                        }}
                        className="p-2"
                        aria-label={isExpanded ? 'Collapse details' : 'Show more details'}
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="border-t border-border bg-muted/30"
                    >
                      <div className="p-4 space-y-3">
                        {columns.map((column) => (
                          <div key={String(column.key)} className="flex justify-between items-center">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                              {column.header}
                            </span>
                            <div className="text-sm text-foreground flex-1 text-right ml-4">
                              {column.render
                                ? column.render(row[column.key], row)
                                : String(row[column.key] || '-')
                              }
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </div>
      ) : (
        // Desktop Table Layout
        <div className="relative w-full overflow-auto border border-border rounded-lg">
          <table className="w-full caption-bottom text-sm">
            <thead className="bg-muted/50">
              <tr className="border-b">
                {columns.map((column) => (
                  <th
                    key={String(column.key)}
                    className={cn(
                      'h-12 px-4 text-left align-middle font-medium text-muted-foreground',
                      column.sortable && 'cursor-pointer select-none hover:bg-muted',
                      column.width && `w-[${column.width}]`,
                      column.className
                    )}
                    onClick={() => column.sortable && handleSort(String(column.key))}
                  >
                    <div className="flex items-center space-x-2">
                      <span>{column.header}</span>
                      {column.sortable && getSortIcon(String(column.key))}
                    </div>
                  </th>
                ))}
                {actions && (
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-20">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((row, index) => (
                <motion.tr
                  key={String(row[keyField])}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.02 }}
                  className={cn(
                    'border-b hover:bg-muted/50 transition-colors',
                    onRowClick && 'cursor-pointer'
                  )}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((column) => (
                    <td
                      key={String(column.key)}
                      className={cn('p-4 align-middle', column.className)}
                    >
                      {column.render
                        ? column.render(row[column.key], row)
                        : String(row[column.key] || '-')
                      }
                    </td>
                  ))}
                  {actions && (
                    <td className="p-4 align-middle">
                      <div onClick={(e) => e.stopPropagation()}>
                        {actions(row)}
                      </div>
                    </td>
                  )}
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pagination.showPagination && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * (pagination.pageSize || 10)) + 1} to{' '}
            {Math.min(currentPage * (pagination.pageSize || 10), sortedData.length)} of{' '}
            {sortedData.length} results
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ResponsiveDataGrid


