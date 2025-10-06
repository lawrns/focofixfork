'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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
  Loader2
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useRealtime } from '@/lib/hooks/useRealtime'
import { motion } from 'framer-motion'

interface TaskCardProps {
  task: {
    id: string
    title: string
    description: string | null
    status: 'todo' | 'in_progress' | 'review' | 'done'
    priority: 'low' | 'medium' | 'high' | 'urgent'
    assignee_id: string | null
    assignee_name?: string
    reporter_id: string
    reporter_name?: string
    estimated_hours: number | null
    actual_hours: number | null
    due_date: string | null
    created_at: string
    updated_at: string
    project_id: string
    milestone_id: string | null
  }
  onEdit?: (taskId: string) => void
  onStatusChange?: (taskId: string, newStatus: string) => void
  onDelete?: (taskId: string) => void
  showActions?: boolean
  showAssignee?: boolean
}

const statusConfig = {
  todo: {
    label: 'To Do',
    color: 'bg-slate-500/10 text-slate-600 hover:bg-slate-500/20',
    icon: Circle,
    borderColor: 'border-l-slate-500',
  },
  in_progress: {
    label: 'In Progress',
    color: 'bg-blue-500/10 text-blue-600 hover:bg-blue-500/20',
    icon: PlayCircle,
    borderColor: 'border-l-blue-500',
  },
  review: {
    label: 'Review',
    color: 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/20',
    icon: AlertTriangle,
    borderColor: 'border-l-amber-500',
  },
  done: {
    label: 'Done',
    color: 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20',
    icon: CheckCircle,
    borderColor: 'border-l-emerald-500',
  },
}

const priorityConfig = {
  low: {
    color: 'bg-slate-500/10 text-slate-600 hover:bg-slate-500/20',
  },
  medium: {
    color: 'bg-blue-500/10 text-blue-600 hover:bg-blue-500/20',
  },
  high: {
    color: 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/20',
  },
  urgent: {
    color: 'bg-red-500/10 text-red-600 hover:bg-red-500/20',
  },
}

export function TaskCard({
  task,
  onEdit,
  onStatusChange,
  onDelete,
  showActions = true,
  showAssignee = true,
}: TaskCardProps) {
  const [currentTask, setCurrentTask] = useState(task)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isUpdated, setIsUpdated] = useState(false)

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
    } catch (error) {
      console.error('Failed to update task status:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDelete = async () => {
    if (!onDelete) return

    try {
      await onDelete(currentTask.id)
    } catch (error) {
      console.error('Failed to delete task:', error)
    }
  }

  const statusInfo = statusConfig[currentTask.status]
  const StatusIcon = statusInfo.icon

  const isOverdue = currentTask.due_date && new Date(currentTask.due_date) < new Date() && currentTask.status !== 'done'
  const progressPercentage = currentTask.estimated_hours && currentTask.actual_hours
    ? Math.min((currentTask.actual_hours / currentTask.estimated_hours) * 100, 100)
    : currentTask.status === 'done' ? 100 : 0

  return (
    <motion.div
      initial={false}
      animate={isUpdated ? { scale: [1, 1.02, 1] } : { scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={`glass-card hover-lift border-l-4 ${statusConfig[currentTask.status].borderColor} ${isOverdue ? 'ring-2 ring-red-500/20' : ''} ${isUpdated ? 'ring-2 ring-primary/20' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="flex-shrink-0 mt-1">
              {isUpdating ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                <StatusIcon className={`h-5 w-5 ${task.status === 'done' ? 'text-green-600' : 'text-muted-foreground'}`} />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <Link
                href={`/tasks/${currentTask.id}`}
                className="block"
              >
                <h3 className={`font-semibold text-sm leading-tight hover:text-primary transition-colors truncate ${
                  currentTask.status === 'done' ? 'line-through text-muted-foreground' : ''
                }`}>
                  {currentTask.title}
                </h3>
              </Link>
              {currentTask.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {currentTask.description}
                </p>
              )}
            </div>
          </div>

          {showActions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 flex-shrink-0">
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleStatusChange('todo')}>
                  <Circle className="mr-2 h-4 w-4" />
                  Mark as To Do
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusChange('in_progress')}>
                  <PlayCircle className="mr-2 h-4 w-4" />
                  Start Progress
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusChange('review')}>
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Move to Review
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusChange('done')}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Mark as Done
                </DropdownMenuItem>
                {onEdit && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onEdit(currentTask.id)}>
                      <Edit className="mr-2 h-4 w-4" />
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
                      <AlertTriangle className="mr-2 h-4 w-4" />
                      Delete Task
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Status and Priority Badges */}
        <div className="flex flex-wrap gap-1">
          <Badge className={`${statusInfo.color} text-xs`}>
            {statusInfo.label}
          </Badge>
          <Badge variant="outline" className={`${priorityConfig[currentTask.priority].color} text-xs`}>
            {currentTask.priority.toUpperCase()}
          </Badge>
          {isOverdue && (
            <Badge variant="destructive" className="text-xs">
              OVERDUE
            </Badge>
          )}
        </div>

        {/* Progress */}
        {currentTask.estimated_hours && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>Progress</span>
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
                  <span>Unassigned</span>
                )}
              </div>
            )}

            {currentTask.due_date && (
              <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 dark:text-red-400' : ''}`}>
                <Calendar className="h-3 w-3" />
                <span>{formatDate(currentTask.due_date)}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
    </motion.div>
  )
}


