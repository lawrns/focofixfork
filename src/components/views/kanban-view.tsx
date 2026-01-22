'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Clock,
  Calendar,
  User,
  AlertTriangle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'

export type TableDataType = 'projects' | 'tasks' | 'milestones'

interface BaseKanbanItem {
  id: string
  name?: string
  title?: string
  status: string
  priority?: string
  created_at: string
  updated_at: string
}

interface ProjectKanbanItem extends BaseKanbanItem {
  name: string
  description: string | null
  progress_percentage: number
  start_date: string | null
  due_date: string | null
  organization_id: string
}

interface TaskKanbanItem extends BaseKanbanItem {
  title: string
  description: string | null
  status: 'backlog' | 'next' | 'in_progress' | 'review' | 'blocked' | 'done'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  assignee_id: string | null
  assignee_name?: string
  estimated_hours: number | null
  actual_hours: number | null
  due_date: string | null
  project_id: string
  milestone_id: string | null
}

interface MilestoneKanbanItem extends BaseKanbanItem {
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

type KanbanItem = ProjectKanbanItem | TaskKanbanItem | MilestoneKanbanItem

interface KanbanViewProps {
  data: KanbanItem[]
  type: TableDataType
  onEdit?: (item: KanbanItem) => void
  onDelete?: (item: KanbanItem) => void
  onView?: (item: KanbanItem) => void
  onCreate?: (status?: string) => void
  onStatusChange?: (item: KanbanItem, newStatus: string) => void
  loading?: boolean
  className?: string
}

const statusColumns = {
  projects: [
    { key: 'planning', label: 'Planning', color: 'bg-blue-600' },
    { key: 'active', label: 'Active', color: 'bg-emerald-600' },
    { key: 'on_hold', label: 'On Hold', color: 'bg-amber-600' },
    { key: 'completed', label: 'Completed', color: 'bg-purple-600' },
    { key: 'cancelled', label: 'Cancelled', color: 'bg-red-600' }
  ],
  tasks: [
    { key: 'backlog', label: 'Backlog', color: 'bg-slate-600' },
    { key: 'next', label: 'Next', color: 'bg-purple-600' },
    { key: 'in_progress', label: 'In Progress', color: 'bg-blue-600' },
    { key: 'review', label: 'Review', color: 'bg-amber-600' },
    { key: 'blocked', label: 'Blocked', color: 'bg-red-600' },
    { key: 'done', label: 'Done', color: 'bg-emerald-600' }
  ],
  milestones: [
    { key: 'planned', label: 'Planned', color: 'bg-slate-600' },
    { key: 'active', label: 'Active', color: 'bg-blue-600' },
    { key: 'completed', label: 'Completed', color: 'bg-emerald-600' },
    { key: 'cancelled', label: 'Cancelled', color: 'bg-red-600' }
  ]
}

const priorityColors = {
  low: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100 border-slate-300 dark:border-slate-600',
  medium: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100 border-blue-300 dark:border-blue-600',
  high: 'bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-100 border-amber-300 dark:border-amber-600',
  urgent: 'bg-red-100 text-red-900 dark:bg-red-900 dark:text-red-100 border-red-300 dark:border-red-600'
}

const KanbanView: React.FC<KanbanViewProps> = ({
  data,
  type,
  onEdit,
  onDelete,
  onView,
  onCreate,
  onStatusChange,
  loading = false,
  className
}) => {
  const [draggedItem, setDraggedItem] = useState<KanbanItem | null>(null)

  // Group items by status
  const groupedData = React.useMemo(() => {
    const groups: Record<string, KanbanItem[]> = {}

    statusColumns[type].forEach(column => {
      groups[column.key] = []
    })

    data.forEach(item => {
      if (groups[item.status]) {
        groups[item.status].push(item)
      } else {
        // Fallback for unknown status
        groups[statusColumns[type][0].key] = groups[statusColumns[type][0].key] || []
        groups[statusColumns[type][0].key].push(item)
      }
    })

    return groups
  }, [data, type])

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result

    // Dropped outside a droppable area
    if (!destination) {
      setDraggedItem(null)
      return
    }

    // Dropped in the same position
    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      setDraggedItem(null)
      return
    }

    // Find the dragged item
    const draggedItem = data.find(item => item.id === draggableId)
    if (!draggedItem) {
      setDraggedItem(null)
      return
    }

    // If status changed, call the status change handler
    if (destination.droppableId !== source.droppableId) {
      onStatusChange?.(draggedItem, destination.droppableId)
    }

    setDraggedItem(null)
  }

  const handleDragStart = (start: any) => {
    const draggedItem = data.find(item => item.id === start.draggableId)
    setDraggedItem(draggedItem || null)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null
    return new Date(dateString).toLocaleDateString()
  }

  const getInitials = (name: string | undefined) => {
    if (!name) return '?'
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getPriorityBadge = (priority?: string) => {
    if (!priority || !priorityColors[priority as keyof typeof priorityColors]) return null
    return (
      <Badge
        variant="outline"
        className={cn('text-xs', priorityColors[priority as keyof typeof priorityColors])}
      >
        {priority.toUpperCase()}
      </Badge>
    )
  }

  const renderKanbanCard = (item: KanbanItem, index: number) => {
    const isOverdue = item.due_date && new Date(item.due_date) < new Date() && item.status !== 'completed' && item.status !== 'done'
    const displayName = 'name' in item ? item.name : 'title' in item ? item.title : ''
    const description = 'description' in item ? item.description : null

    return (
      <Draggable key={item.id} draggableId={item.id} index={index}>
        {(provided, snapshot) => (
          <motion.div
            ref={provided.innerRef}
            {...provided.draggableProps}
            initial={{ opacity: 1 }}
            animate={{
              opacity: snapshot.isDragging ? 0.8 : 1,
              scale: snapshot.isDragging ? 1.02 : 1
            }}
            transition={{ duration: 0.2 }}
            className="mb-3"
          >
            <div {...provided.dragHandleProps}>
            <Card
              className={cn(
                'cursor-pointer hover:shadow-md transition-all duration-200',
                isOverdue && 'border-red-200 dark:border-red-800',
                snapshot.isDragging && 'shadow-lg rotate-2'
              )}
              onClick={() => onView?.(item)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-sm leading-tight line-clamp-2" title={displayName}>
                      {displayName}
                    </CardTitle>
                    {description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {description}
                      </p>
                    )}
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {onView && (
                        <DropdownMenuItem onClick={() => onView(item)}>
                          <Eye className="h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                      )}
                      {onEdit && (
                        <DropdownMenuItem onClick={() => onEdit(item)}>
                          <Edit className="h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                      )}
                      {onDelete && (
                        <>
                          <div className="border-t my-1" />
                          <DropdownMenuItem
                            onClick={() => onDelete(item)}
                            className="text-red-600 dark:text-red-400"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>

              <CardContent className="pt-0 space-y-2">
                {/* Priority */}
                {'priority' in item && getPriorityBadge(item.priority)}

                {/* Progress for projects/milestones */}
                {('progress_percentage' in item) && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Progress</span>
                      <span>{item.progress_percentage}%</span>
                    </div>
                    <Progress value={item.progress_percentage} className="h-1.5" />
                  </div>
                )}

                {/* Task count for milestones */}
                {('task_count' in item) && (
                  <div className="text-xs text-muted-foreground">
                    {(item as MilestoneKanbanItem).completed_tasks || 0} / {(item as MilestoneKanbanItem).task_count || 0} tasks
                  </div>
                )}

                {/* Assignee for tasks */}
                {('assignee_name' in item) && (
                  <div className="flex items-center gap-2">
                    <User className="h-3 w-3 text-muted-foreground" />
                    <div className="flex items-center gap-1">
                      <Avatar className="h-5 w-5">
                        <AvatarFallback className="text-xs">
                          {getInitials((item as TaskKanbanItem).assignee_name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs truncate max-w-20">
                        {(item as TaskKanbanItem).assignee_name || 'Unassigned'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Due date */}
                {item.due_date && (
                  <div className={cn(
                    'flex items-center gap-1 text-xs',
                    isOverdue ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'
                  )}>
                    <Calendar className="h-3 w-3" />
                    <span>{formatDate(item.due_date)}</span>
                    {isOverdue && <AlertTriangle className="h-3 w-3" />}
                  </div>
                )}

                {/* Updated timestamp */}
                <div className="text-xs text-muted-foreground">
                  Updated {formatDate(item.updated_at)}
                </div>
              </CardContent>
            </Card>
            </div>
          </motion.div>
        )}
      </Draggable>
    )
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-8 bg-muted rounded w-48 animate-pulse" />
          <div className="h-10 bg-muted rounded w-32 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="h-8 bg-muted rounded animate-pulse" />
              <div className="space-y-3">
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="h-32 bg-muted rounded-lg animate-pulse" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Kanban Board</h3>
          <p className="text-sm text-muted-foreground">
            Drag and drop to change status
          </p>
        </div>
        {onCreate && (
          <Button onClick={() => onCreate()}>
            <Plus className="h-4 w-4" />
            Add {type.charAt(0).toUpperCase() + type.slice(1, -1)}
          </Button>
        )}
      </div>

      {/* Kanban Board */}
      <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6 overflow-x-auto pb-4">
          {statusColumns[type].map((column) => {
            const columnItems = groupedData[column.key] || []
            const itemCount = columnItems.length

            return (
              <div key={column.key} className="min-w-80">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className={cn('w-3 h-3 rounded-full', column.color)} />
                    <h4 className="font-medium text-sm">{column.label}</h4>
                    <Badge variant="secondary" className="text-xs">
                      {itemCount}
                    </Badge>
                  </div>

                  {onCreate && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onCreate(column.key)}
                      className="h-6 w-6 p-0"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  )}
                </div>

                <Droppable droppableId={column.key}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={cn(
                        'min-h-96 p-3 rounded-lg border-2 border-dashed transition-colors',
                        snapshot.isDraggingOver
                          ? 'border-primary bg-primary/5'
                          : 'border-muted-foreground/25 bg-muted/20'
                      )}
                    >
                      <AnimatePresence>
                        {columnItems.map((item, index) => (
                          <motion.div
                            key={item.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ delay: index * 0.05 }}
                          >
                            {renderKanbanCard(item, index)}
                          </motion.div>
                        ))}
                      </AnimatePresence>

                      {provided.placeholder}

                      {columnItems.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          <div className="text-sm">No {type} in {column.label.toLowerCase()}</div>
                          <div className="text-xs mt-1">Drag items here or create new ones</div>
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            )
          })}
        </div>
      </DragDropContext>
    </div>
  )
}

export default KanbanView
