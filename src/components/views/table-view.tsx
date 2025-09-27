'use client'

import React, { useState, useMemo } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Search,
  Filter,
  SortAsc,
  SortDesc,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Plus,
  Download
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

export type TableDataType = 'projects' | 'tasks' | 'milestones'

interface BaseTableItem {
  id: string
  name?: string
  title?: string
  status: string
  priority?: string
  created_at: string
  updated_at: string
}

interface ProjectTableItem extends BaseTableItem {
  name: string
  description: string | null
  progress_percentage: number
  start_date: string | null
  due_date: string | null
  organization_id: string
}

interface TaskTableItem extends BaseTableItem {
  title: string
  description: string | null
  status: 'todo' | 'in_progress' | 'review' | 'done'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  assignee_id: string | null
  assignee_name?: string
  estimated_hours: number | null
  actual_hours: number | null
  due_date: string | null
  project_id: string
  milestone_id: string | null
}

interface MilestoneTableItem extends BaseTableItem {
  title: string
  description: string | null
  status: 'planned' | 'active' | 'completed' | 'cancelled'
  progress_percentage: number
  due_date: string | null
  completion_date: string | null
  project_id: string
  task_count?: number
  completed_tasks?: number
}

type TableItem = ProjectTableItem | TaskTableItem | MilestoneTableItem

interface TableViewProps {
  data: TableItem[]
  type: TableDataType
  onEdit?: (item: TableItem) => void
  onDelete?: (item: TableItem) => void
  onView?: (item: TableItem) => void
  onCreate?: () => void
  onStatusChange?: (item: TableItem, newStatus: string) => void
  onPriorityChange?: (item: TableItem, newPriority: string) => void
  loading?: boolean
  className?: string
}

const statusConfigs = {
  projects: {
    planning: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300', label: 'Planning' },
    active: { color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300', label: 'Active' },
    on_hold: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300', label: 'On Hold' },
    completed: { color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300', label: 'Completed' },
    cancelled: { color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300', label: 'Cancelled' }
  },
  tasks: {
    todo: { color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300', label: 'To Do' },
    in_progress: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300', label: 'In Progress' },
    review: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300', label: 'Review' },
    done: { color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300', label: 'Done' }
  },
  milestones: {
    planned: { color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300', label: 'Planned' },
    active: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300', label: 'Active' },
    completed: { color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300', label: 'Completed' },
    cancelled: { color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300', label: 'Cancelled' }
  }
}

const priorityConfigs = {
  low: { color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300', label: 'Low' },
  medium: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300', label: 'Medium' },
  high: { color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300', label: 'High' },
  urgent: { color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300', label: 'Urgent' }
}

const TableView: React.FC<TableViewProps> = ({
  data,
  type,
  onEdit,
  onDelete,
  onView,
  onCreate,
  onStatusChange,
  onPriorityChange,
  loading = false,
  className
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [sortField, setSortField] = useState<string>('updated_at')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  // Get table columns based on type
  const getColumns = () => {
    switch (type) {
      case 'projects':
        return [
          { key: 'name', label: 'Project Name', sortable: true },
          { key: 'status', label: 'Status', sortable: true },
          { key: 'priority', label: 'Priority', sortable: true },
          { key: 'progress_percentage', label: 'Progress', sortable: true },
          { key: 'due_date', label: 'Due Date', sortable: true },
          { key: 'updated_at', label: 'Updated', sortable: true },
          { key: 'actions', label: 'Actions', sortable: false }
        ]
      case 'tasks':
        return [
          { key: 'title', label: 'Task Title', sortable: true },
          { key: 'status', label: 'Status', sortable: true },
          { key: 'priority', label: 'Priority', sortable: true },
          { key: 'assignee_name', label: 'Assignee', sortable: true },
          { key: 'estimated_hours', label: 'Est. Hours', sortable: true },
          { key: 'due_date', label: 'Due Date', sortable: true },
          { key: 'updated_at', label: 'Updated', sortable: true },
          { key: 'actions', label: 'Actions', sortable: false }
        ]
      case 'milestones':
        return [
          { key: 'title', label: 'Milestone Title', sortable: true },
          { key: 'status', label: 'Status', sortable: true },
          { key: 'progress_percentage', label: 'Progress', sortable: true },
          { key: 'task_count', label: 'Tasks', sortable: true },
          { key: 'due_date', label: 'Due Date', sortable: true },
          { key: 'updated_at', label: 'Updated', sortable: true },
          { key: 'actions', label: 'Actions', sortable: false }
        ]
      default:
        return []
    }
  }

  // Filter and sort data
  const processedData = useMemo(() => {
    let filtered = data.filter(item => {
      // Search filter
      const searchText = type === 'projects'
        ? (item as ProjectTableItem).name + ' ' + (item as ProjectTableItem).description || ''
        : type === 'tasks'
        ? (item as TaskTableItem).title + ' ' + (item as TaskTableItem).description || ''
        : (item as MilestoneTableItem).title + ' ' + (item as MilestoneTableItem).description || ''

      const matchesSearch = searchText.toLowerCase().includes(searchTerm.toLowerCase())

      // Status filter
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter

      // Priority filter (for projects and tasks)
      const itemPriority = 'priority' in item ? item.priority : undefined
      const matchesPriority = priorityFilter === 'all' || itemPriority === priorityFilter

      return matchesSearch && matchesStatus && matchesPriority
    })

    // Sort data
    filtered.sort((a, b) => {
      let aValue: any = a[sortField as keyof typeof a]
      let bValue: any = b[sortField as keyof typeof b]

      // Handle date fields
      if (sortField.includes('date') || sortField.includes('_at')) {
        aValue = new Date(aValue || '1970-01-01').getTime()
        bValue = new Date(bValue || '1970-01-01').getTime()
      }

      // Handle null values
      if (aValue === null && bValue === null) return 0
      if (aValue === null) return 1
      if (bValue === null) return -1

      // Compare values
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return filtered
  }, [data, searchTerm, statusFilter, priorityFilter, sortField, sortDirection, type])

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString()
  }

  const getStatusBadge = (status: string) => {
    const config = (statusConfigs as any)[type]?.[status]
    return config ? (
      <Badge className={config.color}>{config.label}</Badge>
    ) : (
      <Badge variant="outline">{status}</Badge>
    )
  }

  const getPriorityBadge = (priority?: string) => {
    if (!priority) return null
    const config = priorityConfigs[priority as keyof typeof priorityConfigs]
    return config ? (
      <Badge variant="outline" className={config.color}>{config.label}</Badge>
    ) : null
  }

  const renderCell = (item: TableItem, columnKey: string) => {
    switch (columnKey) {
      case 'name':
      case 'title':
        const displayName = 'name' in item ? item.name : 'title' in item ? item.title : ''
        return (
          <div className="font-medium max-w-xs truncate" title={displayName}>
            {displayName}
          </div>
        )

      case 'status':
        return getStatusBadge(item.status)

      case 'priority':
        return getPriorityBadge('priority' in item ? item.priority : undefined)

      case 'progress_percentage':
        const progress = (item as any).progress_percentage || 0
        return (
          <div className="flex items-center gap-2 min-w-[120px]">
            <Progress value={progress} className="flex-1 h-2" />
            <span className="text-sm text-muted-foreground w-8">{progress}%</span>
          </div>
        )

      case 'assignee_name':
        const assignee = (item as TaskTableItem).assignee_name
        return assignee ? (
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-xs">
                {assignee.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm truncate max-w-24">{assignee}</span>
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">Unassigned</span>
        )

      case 'estimated_hours':
        const hours = (item as TaskTableItem).estimated_hours
        return <span className="text-sm">{hours ? `${hours}h` : '-'}</span>

      case 'task_count':
        const taskCount = (item as MilestoneTableItem).task_count || 0
        const completedTasks = (item as MilestoneTableItem).completed_tasks || 0
        return (
          <span className="text-sm">
            {completedTasks}/{taskCount}
          </span>
        )

      case 'due_date':
      case 'updated_at':
        const dateValue = (item as any)[columnKey]
        return <span className="text-sm text-muted-foreground">{formatDate(dateValue)}</span>

      case 'actions':
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onView && (
                <DropdownMenuItem onClick={() => onView(item)}>
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </DropdownMenuItem>
              )}
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(item)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
              )}
              {onStatusChange && (
                <DropdownMenuItem onClick={() => onStatusChange(item, 'completed')}>
                  <Edit className="mr-2 h-4 w-4" />
                  Mark Complete
                </DropdownMenuItem>
              )}
              {onDelete && (
                <>
                  <div className="border-t my-1" />
                  <DropdownMenuItem
                    onClick={() => onDelete(item)}
                    className="text-red-600 dark:text-red-400"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )

      default:
        return <span>-</span>
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-8 bg-muted rounded w-48 animate-pulse" />
          <div className="h-10 bg-muted rounded w-32 animate-pulse" />
        </div>
        <div className="border rounded-lg">
          <div className="h-12 bg-muted animate-pulse" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-muted/50 animate-pulse border-t" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header with search and filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={`Search ${type}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {Object.entries(statusConfigs[type]).map(([key, config]) => (
                <SelectItem key={key} value={key}>{config.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(type === 'projects' || type === 'tasks') && (
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          {onCreate && (
            <Button onClick={onCreate} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              New {type.charAt(0).toUpperCase() + type.slice(1, -1)}
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {getColumns().map((column) => (
                <TableHead
                  key={column.key}
                  className={cn(
                    column.sortable && 'cursor-pointer hover:bg-muted/50 select-none',
                    'transition-colors'
                  )}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center gap-2">
                    <span>{column.label}</span>
                    {column.sortable && sortField === column.key && (
                      sortDirection === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            <AnimatePresence>
              {processedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={getColumns().length} className="text-center py-12">
                    <div className="text-muted-foreground">
                      <Filter className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-lg mb-2">No {type} found</p>
                      <p className="text-sm">
                        {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all'
                          ? 'Try adjusting your filters'
                          : `Create your first ${type.slice(0, -1)} to get started`}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                processedData.map((item, index) => (
                  <motion.tr
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ delay: index * 0.02 }}
                    className="hover:bg-muted/50 transition-colors"
                  >
                    {getColumns().map((column) => (
                      <TableCell key={column.key} className="py-3">
                        {renderCell(item, column.key)}
                      </TableCell>
                    ))}
                  </motion.tr>
                ))
              )}
            </AnimatePresence>
          </TableBody>
        </Table>
      </div>

      {/* Footer with count */}
      <div className="text-sm text-muted-foreground">
        Showing {processedData.length} of {data.length} {type}
        {searchTerm && ` matching "${searchTerm}"`}
      </div>
    </div>
  )
}

export default TableView
