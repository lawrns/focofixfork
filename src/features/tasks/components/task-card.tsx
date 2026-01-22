'use client'

import { useState, useEffect, memo } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'
import {
  Calendar,
  Clock,
  User,
  MoreVertical,
  Edit,
  CheckCircle,
  Circle,
  AlertTriangle,
  PlayCircle,
  Loader2,
  GripVertical
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useRealtime } from '@/lib/hooks/useRealtime'
import { motion } from 'framer-motion'
import { useTranslation } from '@/lib/i18n/context'
import { TaskQuickActions } from './task-quick-actions'
import { TaskEditDialog } from './task-edit-dialog'
import { PriorityIndicator } from './priority-indicator'
import { InlineEditField } from './inline-edit-field'
import { RecurrenceBadge } from './RecurrenceBadge'
import { useInlineEdit } from '../hooks/use-inline-edit'
import { Task } from '../types'
import { audioService } from '@/lib/audio/audio-service'
import { hapticService } from '@/lib/audio/haptic-service'
import { apiClient } from '@/lib/api-client'

interface TaskCardProps {
  task: Task & {
    assignee_name?: string
    reporter_name?: string
  }
  onEdit?: (taskId: string) => void
  onStatusChange?: (taskId: string, newStatus: string) => void
  onDelete?: (taskId: string) => void
  showActions?: boolean
  showAssignee?: boolean
  assignees?: Array<{ id: string; name: string; email: string }>
}

const statusConfig = {
  backlog: {
    label: 'Backlog',
    color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-600',
    icon: Circle,
    borderColor: 'border-l-slate-600',
  },
  next: {
    label: 'Next',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100 border border-purple-300 dark:border-purple-600',
    icon: PlayCircle,
    borderColor: 'border-l-purple-600',
  },
  in_progress: {
    label: 'In Progress',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100 border border-blue-300 dark:border-blue-600',
    icon: PlayCircle,
    borderColor: 'border-l-blue-600',
  },
  review: {
    label: 'Review',
    color: 'bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-100 border border-amber-300 dark:border-amber-600',
    icon: AlertTriangle,
    borderColor: 'border-l-amber-600',
  },
  done: {
    label: 'Done',
    color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100 border border-emerald-300 dark:border-emerald-600',
    icon: CheckCircle,
    borderColor: 'border-l-emerald-600',
  },
}

const priorityConfig = {
  low: {
    color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-600',
  },
  medium: {
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100 border border-blue-300 dark:border-blue-600',
  },
  high: {
    color: 'bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-100 border border-amber-300 dark:border-amber-600',
  },
  urgent: {
    color: 'bg-red-100 text-red-900 dark:bg-red-900 dark:text-red-100 border border-red-300 dark:border-red-600',
  },
}

function TaskCardComponent({
  task,
  onEdit,
  onStatusChange,
  onDelete,
  showActions = true,
  showAssignee = true,
  assignees = [],
}: TaskCardProps) {
  const { t } = useTranslation()
  const [currentTask, setCurrentTask] = useState(task)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isUpdated, setIsUpdated] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)

  // Inline edit hook
  const inlineEdit = useInlineEdit(currentTask, {
    onSave: async (fieldName, value) => {
      await handleInlineFieldUpdate(fieldName, value)
    },
  })

  const handleInlineFieldUpdate = async (fieldName: string, value: any) => {
    try {
      setIsUpdating(true)

      // Prepare the update payload
      const updatePayload: any = {}
      updatePayload[fieldName] = value

      // Send update to API
      const response = await apiClient.put(`/api/tasks/${currentTask.id}`, updatePayload)

      if (!response.success || !response.data) {
        audioService.play('error')
        hapticService.error()
        throw new Error(response.error || 'Failed to update task')
      }

      const updatedTask = response.data

      // Update local state
      if (!updatedTask.queued) {
        setCurrentTask(updatedTask)
      } else {
        toast.info('Update queued for offline sync')
      }
      
      audioService.play('sync')
      hapticService.light()
      setIsUpdated(true)
      setTimeout(() => setIsUpdated(false), 3000)
    } catch (error) {
      audioService.play('error')
      hapticService.error()
      console.error('Failed to update task field:', error)
      throw error
    } finally {
      setIsUpdating(false)
    }
  }

  // Real-time updates for this task
  useRealtime(
    { projectId: task.project_id },
    (payload) => {
      if (payload.table === 'tasks' && payload.new?.id === task.id) {
        if (payload.eventType === 'UPDATE') {
          setCurrentTask(payload.new)
          setIsUpdated(true)
          // Reset the updated indicator after 3 seconds
          setTimeout(() => setIsUpdated(false), 3000)
        } else if (payload.eventType === 'DELETE') {
          // Handle task deletion - could trigger a callback or hide the component
          console.log('Task deleted:', task.id)
        }
      }
    }
  )

  // Update local state when prop changes
  useEffect(() => {
    setCurrentTask(task)
  }, [task])

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

  const handleStatusChange = async (newStatus: string) => {
    if (!onStatusChange) return

    setIsUpdating(true)
    try {
      await onStatusChange(currentTask.id, newStatus)
      
      // World-class sensory feedback
      if (newStatus === 'done') {
        audioService.play('complete')
        hapticService.success()
      } else {
        audioService.play('sync')
        hapticService.light()
      }
    } catch (error) {
      audioService.play('error')
      hapticService.error()
      console.error('Failed to update task status:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDelete = () => {
    setShowDeleteDialog(true)
  }

  const confirmDelete = async () => {
    if (!onDelete) return

    try {
      await onDelete(currentTask.id)
      audioService.play('error')
      hapticService.error()
      setShowDeleteDialog(false)
    } catch (error) {
      audioService.play('error')
      hapticService.error()
      console.error('Failed to delete task:', error)
      setShowDeleteDialog(false)
    }
  }

  const statusInfo = statusConfig[currentTask.status]
  const StatusIcon = statusInfo.icon

  const isOverdue = currentTask.due_date && new Date(currentTask.due_date) < new Date() && currentTask.status !== 'done'
  const progressPercentage = currentTask.estimated_hours && currentTask.actual_hours
    ? Math.min((currentTask.actual_hours / currentTask.estimated_hours) * 100, 100)
    : currentTask.status === 'done' ? 100 : 0

  return (
    <>
      <motion.div
        initial={false}
        animate={isUpdated ? { scale: [1, 1.02, 1] } : { scale: 1 }}
        transition={{ duration: 0.3 }}
      >
      <Card className={`glass-card hover-lift border-l-4 ${statusConfig[currentTask.status].borderColor} ${isOverdue ? 'ring-2 ring-red-500/20' : ''} ${isUpdated ? 'ring-2 ring-primary/20' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          {/* Drag Handle - Left Side */}
          <div className="flex-shrink-0 mt-1 cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted transition-colors" title="Drag to reorder">
            <GripVertical className="h-5 w-5 text-foreground" aria-label="Drag handle" />
          </div>

          {/* Status Icon and Task Content - Middle */}
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="flex-shrink-0 mt-1">
              {isUpdating ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-label="Updating task" />
              ) : (
                <StatusIcon className={`h-5 w-5 ${task.status === 'done' ? 'text-green-600' : 'text-muted-foreground'}`} aria-hidden="true" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              {inlineEdit.editingField === 'title' ? (
                <InlineEditField
                  fieldName="title"
                  fieldType="text"
                  value={currentTask.title}
                  editValue={inlineEdit.editValue}
                  isEditing={true}
                  isLoading={inlineEdit.isLoading}
                  error={inlineEdit.error}
                  onStartEdit={() => {}}
                  onSave={async (value) => {
                    return await inlineEdit.saveChanges('title', value)
                  }}
                  onCancel={inlineEdit.cancelEditing}
                  onKeyDown={inlineEdit.handleKeyDown}
                  onBlur={inlineEdit.handleBlur}
                  onChange={inlineEdit.setEditValue}
                  inputRef={inlineEdit.inputRef}
                />
              ) : (
                <Link
                  href={`/tasks/${currentTask.id}`}
                  className="block"
                  aria-label={`View task: ${currentTask.title}`}
                >
                  <h3
                    className={`font-semibold text-base leading-tight hover:text-primary transition-colors truncate cursor-pointer rounded px-1 py-0.5 hover:bg-muted ${
                      currentTask.status === 'done' ? 'line-through text-muted-foreground' : ''
                    }`}
                    onDoubleClick={() => inlineEdit.startEditing('title', currentTask.title)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        inlineEdit.startEditing('title', currentTask.title)
                      }
                    }}
                    title="Double-click to edit title"
                  >
                    {currentTask.title}
                  </h3>
                </Link>
              )}
              {currentTask.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {currentTask.description}
                </p>
              )}
            </div>
          </div>

          {/* Actions Menu - Right Side */}
          {showActions && (
            <div className="flex items-center gap-1">
              <TaskQuickActions
                task={currentTask}
                assignees={assignees}
                showAssigneeActions={showAssignee}
                onEdit={onEdit}
                onDelete={onDelete}
              />
              <DropdownMenu>
                <TooltipProvider delayDuration={500}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-10 w-10 p-0 flex-shrink-0 hover:bg-muted" aria-label={`Actions for ${currentTask.title}`}>
                          <MoreVertical className="h-5 w-5" aria-hidden="true" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">More actions</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleStatusChange('backlog')}>
                    <Circle className="h-4 w-4" aria-hidden="true" />
                    Move to Backlog
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleStatusChange('next')}>
                    <PlayCircle className="h-4 w-4" aria-hidden="true" />
                    Move to Next
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleStatusChange('in_progress')}>
                    <PlayCircle className="h-4 w-4" aria-hidden="true" />
                    Start Progress
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleStatusChange('review')}>
                    <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                    Move to Review
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleStatusChange('done')}>
                    <CheckCircle className="h-4 w-4" aria-hidden="true" />
                    Mark as Done
                  </DropdownMenuItem>
                  {onEdit && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onEdit(currentTask.id)}>
                        <Edit className="h-4 w-4" aria-hidden="true" />
                        Edit Task
                      </DropdownMenuItem>
                    </>
                  )}
                  {onDelete && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={handleDelete}
                        className="text-red-600 dark:text-red-400"
                      >
                        <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                        Delete Task
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Status and Priority Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={statusInfo.color + ' text-sm font-semibold'}>
            {t(`status.${currentTask.status}`)}
          </Badge>
          <div className="flex items-center gap-2">
            {inlineEdit.editingField === 'priority' ? (
              <InlineEditField
                fieldName="priority"
                fieldType="select"
                value={currentTask.priority}
                editValue={inlineEdit.editValue}
                isEditing={true}
                isLoading={inlineEdit.isLoading}
                error={inlineEdit.error}
                selectOptions={[
                  { value: 'low', label: 'Low' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'high', label: 'High' },
                  { value: 'urgent', label: 'Urgent' },
                ]}
                onStartEdit={() => {}}
                onSave={async (value) => {
                  return await inlineEdit.saveChanges('priority', value)
                }}
                onCancel={inlineEdit.cancelEditing}
                onKeyDown={inlineEdit.handleKeyDown}
                onBlur={inlineEdit.handleBlur}
                onChange={inlineEdit.setEditValue}
                inputRef={inlineEdit.inputRef}
                data-testid="inline-priority-dropdown"
              />
            ) : (
              <>
                <PriorityIndicator
                  priority={currentTask.priority as any}
                  variant="dot"
                />
                <Badge
                  className={`${priorityConfig[currentTask.priority].color} text-sm font-semibold cursor-pointer`}
                  onDoubleClick={() => inlineEdit.startEditing('priority', currentTask.priority)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      inlineEdit.startEditing('priority', currentTask.priority)
                    }
                  }}
                  title="Double-click to edit priority"
                >
                  {t(`priority.${currentTask.priority}`)}
                </Badge>
              </>
            )}
          </div>
          {isOverdue && (
            <Badge className="bg-red-100 text-red-900 dark:bg-red-900 dark:text-red-100 border border-red-300 dark:border-red-600 text-sm font-semibold">
              {t('task.overdue')}
            </Badge>
          )}
          {currentTask.is_recurring && (
            <RecurrenceBadge pattern={currentTask.recurrence_pattern} />
          )}
        </div>

        {/* Progress */}
        {currentTask.estimated_hours && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>{t('task.progress')}</span>
              <span>
                {currentTask.actual_hours || 0}h / {currentTask.estimated_hours}h
              </span>
            </div>
            <Progress value={progressPercentage} className="h-1" />
          </div>
        )}

        {/* Assignee and Due Date */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            {showAssignee && (
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {currentTask.assignee_name ? (
                  <div className="flex items-center gap-1">
                    <Avatar className="h-4 w-4">
                      <AvatarFallback className="text-xs">
                        {getInitials(currentTask.assignee_name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate max-w-16">{currentTask.assignee_name}</span>
                  </div>
                ) : (
                  <span>{t('task.unassigned')}</span>
                )}
              </div>
            )}

            {currentTask.due_date && (
              <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 dark:text-red-400' : ''}`}>
                <Calendar className="h-3 w-3" />
                {inlineEdit.editingField === 'due_date' ? (
                  <InlineEditField
                    fieldName="due_date"
                    fieldType="date"
                    value={currentTask.due_date}
                    editValue={inlineEdit.editValue}
                    isEditing={true}
                    isLoading={inlineEdit.isLoading}
                    error={inlineEdit.error}
                    onStartEdit={() => {}}
                    onSave={async (value) => {
                      return await inlineEdit.saveChanges('due_date', value)
                    }}
                    onCancel={inlineEdit.cancelEditing}
                    onKeyDown={inlineEdit.handleKeyDown}
                    onBlur={inlineEdit.handleBlur}
                    onChange={inlineEdit.setEditValue}
                    inputRef={inlineEdit.inputRef}
                  />
                ) : (
                  <span
                    className="cursor-pointer rounded px-1 py-0.5 hover:bg-muted transition-colors"
                    onDoubleClick={() => inlineEdit.startEditing('due_date', currentTask.due_date)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        inlineEdit.startEditing('due_date', currentTask.due_date)
                      }
                    }}
                    title="Double-click to edit due date"
                  >
                    {formatDate(currentTask.due_date)}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
    </motion.div>

    <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('task.deleteTask')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('task.deleteConfirmation', { taskTitle: currentTask.title })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={confirmDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {t('common.delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    {/* Task Edit Dialog */}
    <TaskEditDialog
      isOpen={showEditDialog}
      onClose={() => setShowEditDialog(false)}
      task={currentTask}
      onTaskUpdated={(updatedTask) => {
        setCurrentTask(updatedTask)
        setIsUpdated(true)
        setTimeout(() => setIsUpdated(false), 3000)
      }}
    />
  </>
  )
}

// Memoize TaskCard to prevent unnecessary re-renders
export const TaskCard = memo(TaskCardComponent, (prevProps, nextProps) => {
  // Custom comparison function - only re-render if task data actually changed
  return (
    prevProps.task.id === nextProps.task.id &&
    prevProps.task.status === nextProps.task.status &&
    prevProps.task.priority === nextProps.task.priority &&
    prevProps.task.title === nextProps.task.title &&
    prevProps.task.description === nextProps.task.description &&
    prevProps.showActions === nextProps.showActions &&
    prevProps.showAssignee === nextProps.showAssignee
  )
})
