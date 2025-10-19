'use client'

import { useState, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/design-system'
import { 
  ChevronUp, 
  ChevronDown, 
  MoreHorizontal, 
  Download, 
  Filter,
  Columns,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Column<T> {
  key: keyof T | string
  title: string
  width?: number
  sortable?: boolean
  resizable?: boolean
  render?: (value: any, row: T, index: number) => React.ReactNode
  headerRender?: () => React.ReactNode
}

interface DataGridProps<T> {
  data: T[]
  columns: Column<T>[]
  onRowClick?: (row: T, index: number) => void
  onRowSelect?: (row: T, selected: boolean) => void
  onBulkAction?: (selectedRows: T[], action: string) => void
  loading?: boolean
  emptyState?: React.ReactNode
  className?: string
  height?: number
  virtualScrolling?: boolean
  stickyHeader?: boolean
  resizableColumns?: boolean
  sortableColumns?: boolean
  exportable?: boolean
  filterable?: boolean
}

export function DataGrid<T extends Record<string, any>>({
  data,
  columns,
  onRowClick,
  onRowSelect,
  onBulkAction,
  loading = false,
  emptyState,
  className,
  height = 400,
  virtualScrolling = false,
  stickyHeader = true,
  resizableColumns = true,
  sortableColumns = true,
  exportable = true,
  filterable = true
}: DataGridProps<T>) {
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null)
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({})
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    new Set(columns.map(col => col.key as string))
  )

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortConfig) return data

    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.key]
      const bValue = b[sortConfig.key]

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })
  }, [data, sortConfig])

  // Handle sorting
  const handleSort = useCallback((key: string) => {
    setSortConfig(prev => {
      if (prev?.key === key) {
        return prev.direction === 'asc' 
          ? { key, direction: 'desc' }
          : null
      }
      return { key, direction: 'asc' }
    })
  }, [])

  // Handle row selection
  const handleRowSelect = useCallback((index: number, selected: boolean) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev)
      if (selected) {
        newSet.add(index)
      } else {
        newSet.delete(index)
      }
      return newSet
    })
  }, [])

  // Handle select all
  const handleSelectAll = useCallback((selected: boolean) => {
    if (selected) {
      setSelectedRows(new Set(sortedData.map((_, index) => index)))
    } else {
      setSelectedRows(new Set())
    }
  }, [sortedData])

  // Handle column resize
  const handleColumnResize = useCallback((key: string, width: number) => {
    setColumnWidths(prev => ({ ...prev, [key]: width }))
  }, [])

  // Export data
  const handleExport = useCallback(() => {
    const csvContent = [
      columns.map(col => col.title).join(','),
      ...sortedData.map(row => 
        columns.map(col => {
          const value = row[col.key as keyof T]
          return typeof value === 'string' ? `"${value}"` : value
        }).join(',')
      )
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'data.csv'
    a.click()
    URL.revokeObjectURL(url)
  }, [columns, sortedData])

  // Get sort icon
  const getSortIcon = (key: string) => {
    if (sortConfig?.key !== key) return <ArrowUpDown className="w-4 h-4 opacity-50" />
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="w-4 h-4" />
      : <ArrowDown className="w-4 h-4" />
  }

  // Render cell content
  const renderCell = (column: Column<T>, row: T, index: number) => {
    if (column.render) {
      return column.render(row[column.key as keyof T], row, index)
    }
    return row[column.key as keyof T]
  }

  if (loading) {
    return (
      <Card className={cn('p-0', className)}>
        <div className="animate-pulse">
          <div className="h-12 bg-gray-200 rounded-t-lg"></div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 border-t border-gray-200"></div>
          ))}
        </div>
      </Card>
    )
  }

  if (data.length === 0) {
    return (
      <Card className={cn('p-8 text-center', className)}>
        {emptyState || (
          <div>
            <p className="text-gray-500">No data available</p>
          </div>
        )}
      </Card>
    )
  }

  return (
    <Card className={cn('p-0 overflow-hidden', className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          {onBulkAction && selectedRows.size > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">
                {selectedRows.size} selected
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onBulkAction(
                  Array.from(selectedRows).map(index => sortedData[index]),
                  'delete'
                )}
              >
                Delete Selected
              </Button>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {filterable && (
            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
          )}
          
          {exportable && (
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          )}
          
          <Button variant="outline" size="sm">
            <Columns className="w-4 h-4 mr-2" />
            Columns
          </Button>
        </div>
      </div>

      {/* Table */}
      <div 
        className="overflow-auto"
        style={{ height: virtualScrolling ? height : 'auto' }}
      >
        <table className="w-full">
          <thead className={cn(
            'bg-gray-50 border-b border-gray-200',
            stickyHeader && 'sticky top-0 z-10'
          )}>
            <tr>
              {onRowSelect && (
                <th className="w-12 p-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedRows.size === sortedData.length && sortedData.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                </th>
              )}
              
              {columns.map((column) => (
                <th
                  key={column.key as string}
                  className={cn(
                    'p-3 text-left text-sm font-medium text-gray-900',
                    column.sortable && sortableColumns && 'cursor-pointer hover:bg-gray-100',
                    resizableColumns && 'resize-x'
                  )}
                  style={{ 
                    width: columnWidths[column.key as string] || column.width || 'auto',
                    minWidth: column.width || 100
                  }}
                  onClick={() => column.sortable && sortableColumns && handleSort(column.key as string)}
                >
                  <div className="flex items-center space-x-1">
                    {column.headerRender ? column.headerRender() : column.title}
                    {column.sortable && sortableColumns && getSortIcon(column.key as string)}
                  </div>
                </th>
              ))}
              
              <th className="w-12 p-3"></th>
            </tr>
          </thead>
          
          <tbody className="divide-y divide-gray-200">
            {sortedData.map((row, index) => (
              <tr
                key={index}
                className={cn(
                  'hover:bg-gray-50 transition-colors duration-150',
                  selectedRows.has(index) && 'bg-blue-50',
                  onRowClick && 'cursor-pointer'
                )}
                onClick={() => onRowClick?.(row, index)}
              >
                {onRowSelect && (
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selectedRows.has(index)}
                      onChange={(e) => {
                        e.stopPropagation()
                        handleRowSelect(index, e.target.checked)
                      }}
                      className="rounded border-gray-300"
                    />
                  </td>
                )}
                
                {columns.map((column) => (
                  <td
                    key={column.key as string}
                    className="p-3 text-sm text-gray-900"
                  >
                    {renderCell(column, row, index)}
                  </td>
                ))}
                
                <td className="p-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      // Handle row actions
                    }}
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
