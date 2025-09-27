'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, MoreHorizontal, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Column<T> {
  key: keyof T
  header: string
  sortable?: boolean
  priority?: 'high' | 'medium' | 'low' // For mobile display priority
  render?: (value: any, row: T) => React.ReactNode
  className?: string
}

interface MobileTableProps<T> {
  data: T[]
  columns: Column<T>[]
  keyField: keyof T
  className?: string
  mobileBreakpoint?: number
  onRowClick?: (row: T) => void
  actions?: (row: T) => React.ReactNode
  emptyMessage?: string
  loading?: boolean
}

type SortDirection = 'asc' | 'desc' | null
type SortConfig = {
  key: string
  direction: SortDirection
}

export function MobileTable<T extends Record<string, any>>({
  data,
  columns,
  keyField,
  className,
  mobileBreakpoint = 768,
  onRowClick,
  actions,
  emptyMessage = 'No data available',
  loading = false
}: MobileTableProps<T>) {
  const [isMobile, setIsMobile] = useState(false)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: '', direction: null })

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

  // Sort data
  const sortedData = React.useMemo(() => {
    if (!sortConfig.direction) return data

    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.key]
      const bValue = b[sortConfig.key]

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })
  }, [data, sortConfig])

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

  // Get priority columns for mobile (high priority first)
  const getPriorityColumns = () => {
    const sorted = [...columns].sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      const aPriority = priorityOrder[a.priority || 'medium']
      const bPriority = priorityOrder[b.priority || 'medium']
      return bPriority - aPriority
    })
    return sorted
  }

  if (loading) {
    return (
      <div className={cn('w-full', className)}>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  if (!sortedData.length) {
    return (
      <div className={cn('w-full', className)}>
        <div className="text-center py-12 text-muted-foreground">
          {emptyMessage}
        </div>
      </div>
    )
  }

  if (isMobile) {
    // Mobile Card Layout
    const priorityColumns = getPriorityColumns()

    return (
      <div className={cn('w-full space-y-4', className)}>
        {sortedData.map((row, index) => {
          const rowId = String(row[keyField])
          const isExpanded = expandedRows.has(rowId)

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
              {/* Primary Content Row */}
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    {/* Primary Column (highest priority) */}
                    {priorityColumns[0] && (
                      <div className="flex items-center space-x-3">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-foreground truncate">
                            {priorityColumns[0].render
                              ? priorityColumns[0].render(row[priorityColumns[0].key], row)
                              : String(row[priorityColumns[0].key])
                            }
                          </div>
                          {priorityColumns[1] && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {priorityColumns[1].render
                                ? priorityColumns[1].render(row[priorityColumns[1].key], row)
                                : String(row[priorityColumns[1].key])
                              }
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions and Expand Button */}
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
                      aria-label={isExpanded ? 'Collapse row' : 'Expand row'}
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

              {/* Expanded Content */}
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
                        <div key={String(column.key)} className="flex justify-between items-start">
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            {column.header}
                          </span>
                          <div className="text-sm text-foreground text-right flex-1 ml-4">
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
    )
  }

  // Desktop Table Layout
  return (
    <div className={cn('relative w-full overflow-auto', className)}>
      <table className="w-full caption-bottom text-sm">
        <thead className="[&_tr]:border-b">
          <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
            {columns.map((column) => (
              <th
                key={String(column.key)}
                className={cn(
                  'h-12 px-4 text-left align-middle font-medium text-muted-foreground',
                  column.sortable && 'cursor-pointer select-none hover:bg-muted/50',
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
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody className="[&_tr:last-child]:border-0">
          {sortedData.map((row, index) => (
            <motion.tr
              key={String(row[keyField])}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: index * 0.02 }}
              className={cn(
                'border-b transition-colors hover:bg-muted/50',
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
  )
}

export default MobileTable


