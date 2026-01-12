'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/design-system'
import { Button } from '@/components/ui/button'
import { 
  ChevronDown, 
  ChevronRight, 
  MoreHorizontal,
  Eye,
  Edit,
  Trash2
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Column<T> {
  key: keyof T | string
  title: string
  mobile?: boolean
  tablet?: boolean
  desktop?: boolean
  render?: (value: any, row: T, index: number) => React.ReactNode
}

interface ResponsiveTableProps<T> {
  data: T[]
  columns: Column<T>[]
  onRowClick?: (row: T, index: number) => void
  onRowAction?: (row: T, action: string) => void
  loading?: boolean
  emptyState?: React.ReactNode
  className?: string
  breakpoints?: {
    mobile: number
    tablet: number
    desktop: number
  }
}

export function ResponsiveTable<T extends Record<string, any>>({
  data,
  columns,
  onRowClick,
  onRowAction,
  loading = false,
  emptyState,
  className,
  breakpoints = {
    mobile: 640,
    tablet: 768,
    desktop: 1024
  }
}: ResponsiveTableProps<T>) {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())

  // Get visible columns based on screen size
  const getVisibleColumns = (screenSize: 'mobile' | 'tablet' | 'desktop') => {
    return columns.filter(col => {
      switch (screenSize) {
        case 'mobile':
          return col.mobile !== false
        case 'tablet':
          return col.tablet !== false
        case 'desktop':
          return col.desktop !== false
        default:
          return true
      }
    })
  }

  // Toggle row expansion
  const toggleRowExpansion = (index: number) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev)
      if (newSet.has(index)) {
        newSet.delete(index)
      } else {
        newSet.add(index)
      }
      return newSet
    })
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
    <div className={cn('space-y-4', className)}>
      {/* Desktop Table */}
      <div className="hidden lg:block">
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {getVisibleColumns('desktop').map((column) => (
                    <th
                      key={column.key as string}
                      className="p-4 text-left text-sm font-medium text-gray-900"
                    >
                      {column.title}
                    </th>
                  ))}
                  <th className="w-12 p-4"></th>
                </tr>
              </thead>
              
              <tbody className="divide-y divide-gray-200">
                {data.map((row, index) => (
                  <tr
                    key={index}
                    className={cn(
                      'hover:bg-gray-50 transition-colors duration-150',
                      onRowClick && 'cursor-pointer'
                    )}
                    onClick={() => onRowClick?.(row, index)}
                  >
                    {getVisibleColumns('desktop').map((column) => (
                      <td
                        key={column.key as string}
                        className="p-4 text-sm text-gray-900"
                      >
                        {renderCell(column, row, index)}
                      </td>
                    ))}
                    
                    <td className="p-4">
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
      </div>

      {/* Tablet Table */}
      <div className="hidden md:block lg:hidden">
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {getVisibleColumns('tablet').map((column) => (
                    <th
                      key={column.key as string}
                      className="p-3 text-left text-sm font-medium text-gray-900"
                    >
                      {column.title}
                    </th>
                  ))}
                  <th className="w-12 p-3"></th>
                </tr>
              </thead>
              
              <tbody className="divide-y divide-gray-200">
                {data.map((row, index) => (
                  <tr
                    key={index}
                    className={cn(
                      'hover:bg-gray-50 transition-colors duration-150',
                      onRowClick && 'cursor-pointer'
                    )}
                    onClick={() => onRowClick?.(row, index)}
                  >
                    {getVisibleColumns('tablet').map((column) => (
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
      </div>

      {/* Mobile Cards */}
      <div className="block md:hidden">
        <div className="space-y-3">
          {data.map((row, index) => (
            <Card
              key={index}
              className={cn(
                'p-4 cursor-pointer transition-all duration-200 hover:shadow-md',
                onRowClick && 'hover:bg-gray-50'
              )}
              onClick={() => onRowClick?.(row, index)}
            >
              <div className="space-y-3">
                {/* Primary content */}
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    {getVisibleColumns('mobile').slice(0, 2).map((column) => (
                      <div key={column.key as string} className="mb-2">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                          {column.title}
                        </p>
                        <p className="text-sm text-gray-900 truncate">
                          {renderCell(column, row, index)}
                        </p>
                      </div>
                    ))}
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleRowExpansion(index)
                    }}
                  >
                    {expandedRows.has(index) ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </Button>
                </div>

                {/* Expanded content */}
                {expandedRows.has(index) && (
                  <div className="pt-3 border-t border-gray-200 space-y-2">
                    {getVisibleColumns('mobile').slice(2).map((column) => (
                      <div key={column.key as string}>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                          {column.title}
                        </p>
                        <p className="text-sm text-gray-900">
                          {renderCell(column, row, index)}
                        </p>
                      </div>
                    ))}
                    
                    {/* Action buttons */}
                    <div className="flex space-x-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          onRowAction?.(row, 'view')
                        }}
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          onRowAction?.(row, 'edit')
                        }}
                      >
                        <Edit className="w-4 h-4" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          onRowAction?.(row, 'delete')
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
