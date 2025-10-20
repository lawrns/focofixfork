'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { 
  MoreVertical, 
  Edit, 
  Trash2, 
  Copy, 
  Archive, 
  Star, 
  Clock, 
  User, 
  Calendar,
  CheckCircle,
  PlayCircle,
  AlertTriangle,
  Circle
} from 'lucide-react'
import { Task } from '../types'
import { useTaskUpdates } from '../hooks/use-task-updates'
import { useTranslation } from '@/lib/i18n/context'
import { cn } from '@/lib/utils'

interface TaskQuickActionsProps {
  task: Task & {
    is_favorite?: boolean
  }
  onEdit?: (taskId: string) => void
  onDelete?: (taskId: string) => void
  onDuplicate?: (task: Task) => void
  onArchive?: (taskId: string) => void
  onToggleFavorite?: (taskId: string) => void
  showStatusActions?: boolean
  showPriorityActions?: boolean
  showAssigneeActions?: boolean
  showDueDateActions?: boolean
  assignees?: Array<{ id: string; name: string; email: string }>
  className?: string
}

export function TaskQuickActions({
  task,
  onEdit,
  onDelete,
  onDuplicate,
  onArchive,
  onToggleFavorite,
  showStatusActions = true,
  showPriorityActions = true,
  showAssigneeActions = true,
  showDueDateActions = true,
  assignees = [],
  className
}: TaskQuickActionsProps) {
  const { t } = useTranslation()
  const { updateTaskStatus, updateTaskPriority, updateTaskAssignee, updateTaskDueDate, isUpdating } = useTaskUpdates()

  const handleStatusChange = async (status: Task['status']) => {
    try {
      await updateTaskStatus(task.id, status)
    } catch (error) {
      console.error('Failed to update task status:', error)
    }
  }

  const handlePriorityChange = async (priority: Task['priority']) => {
    try {
      await updateTaskPriority(task.id, priority)
    } catch (error) {
      console.error('Failed to update task priority:', error)
    }
  }

  const handleAssigneeChange = async (assigneeId: string | null) => {
    try {
      await updateTaskAssignee(task.id, assigneeId)
    } catch (error) {
      console.error('Failed to update task assignee:', error)
    }
  }

  const handleDueDateChange = async (days: number) => {
    try {
      const newDate = new Date()
      newDate.setDate(newDate.getDate() + days)
      await updateTaskDueDate(task.id, newDate.toISOString().split('T')[0])
    } catch (error) {
      console.error('Failed to update task due date:', error)
    }
  }

  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'todo': return <Circle className="h-4 w-4" />
      case 'in_progress': return <PlayCircle className="h-4 w-4" />
      case 'review': return <AlertTriangle className="h-4 w-4" />
      case 'done': return <CheckCircle className="h-4 w-4" />
      default: return <Circle className="h-4 w-4" />
    }
  }

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'low': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100'
      case 'medium': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100'
      case 'high': return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100'
      case 'urgent': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100'
    }
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Status Quick Actions */}
      {showStatusActions && (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleStatusChange('todo')}
            disabled={isUpdating || task.status === 'todo'}
            className="h-8 px-2"
          >
            <Circle className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleStatusChange('in_progress')}
            disabled={isUpdating || task.status === 'in_progress'}
            className="h-8 px-2"
          >
            <PlayCircle className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleStatusChange('review')}
            disabled={isUpdating || task.status === 'review'}
            className="h-8 px-2"
          >
            <AlertTriangle className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleStatusChange('done')}
            disabled={isUpdating || task.status === 'done'}
            className="h-8 px-2"
          >
            <CheckCircle className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Priority Badge */}
      {showPriorityActions && (
        <Badge 
          className={cn(getPriorityColor(task.priority), 'cursor-pointer hover:opacity-80')}
          onClick={() => {
            const priorities: Task['priority'][] = ['low', 'medium', 'high', 'urgent']
            const currentIndex = priorities.indexOf(task.priority)
            const nextPriority = priorities[(currentIndex + 1) % priorities.length]
            handlePriorityChange(nextPriority)
          }}
        >
          {t(`priority.${task.priority}`)}
        </Badge>
      )}

      {/* Assignee Quick Actions */}
      {showAssigneeActions && assignees.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 px-2">
              <User className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleAssigneeChange(null)}>
              {t('task.unassigned')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {assignees.map(assignee => (
              <DropdownMenuItem 
                key={assignee.id} 
                onClick={() => handleAssigneeChange(assignee.id)}
              >
                {assignee.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Due Date Quick Actions */}
      {showDueDateActions && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 px-2">
              <Calendar className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleDueDateChange(0)}>
              {t('task.dueToday')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleDueDateChange(1)}>
              {t('task.dueTomorrow')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleDueDateChange(7)}>
              {t('task.dueNextWeek')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => updateTaskDueDate(task.id, null)}>
              {t('task.removeDueDate')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* More Actions Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">{t('common.openMenu')}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {onEdit && (
            <DropdownMenuItem onClick={() => onEdit(task.id)}>
              <Edit className="mr-2 h-4 w-4" />
              {t('task.editTask')}
            </DropdownMenuItem>
          )}
          
          {onDuplicate && (
            <DropdownMenuItem onClick={() => onDuplicate(task)}>
              <Copy className="mr-2 h-4 w-4" />
              {t('task.duplicateTask')}
            </DropdownMenuItem>
          )}

          {onToggleFavorite && (
            <DropdownMenuItem onClick={() => onToggleFavorite(task.id)}>
              <Star className="mr-2 h-4 w-4" />
              {task.is_favorite ? t('task.removeFromFavorites') : t('task.addToFavorites')}
            </DropdownMenuItem>
          )}

          {onArchive && (
            <DropdownMenuItem onClick={() => onArchive(task.id)}>
              <Archive className="mr-2 h-4 w-4" />
              {t('task.archiveTask')}
            </DropdownMenuItem>
          )}

          {onDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onDelete(task.id)}
                className="text-red-600 dark:text-red-400"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {t('task.deleteTask')}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

