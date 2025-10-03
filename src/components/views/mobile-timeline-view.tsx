'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  TrendingUp
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

interface Milestone {
  id: string
  name: string
  start_date: string
  due_date: string
  status: 'planning' | 'active' | 'completed' | 'cancelled'
  progress_percentage?: number
  dependencies?: string[]
}

interface Task {
  id: string
  milestone_id: string
  name: string
  start_date?: string
  due_date?: string
  status: 'todo' | 'in_progress' | 'completed'
  assignee_id?: string
}

interface Project {
  id: string
  name: string
  milestones: Milestone[]
  tasks: Task[]
}

interface MobileTimelineViewProps {
  project: Project
  className?: string
}

const MobileTimelineView: React.FC<MobileTimelineViewProps> = ({ project, className }) => {
  const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(new Set())

  const toggleMilestone = (milestoneId: string) => {
    setExpandedMilestones(prev => {
      const newSet = new Set(prev)
      if (newSet.has(milestoneId)) {
        newSet.delete(milestoneId)
      } else {
        newSet.add(milestoneId)
      }
      return newSet
    })
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500'
      case 'active':
      case 'in_progress':
        return 'bg-blue-500'
      case 'planning':
      case 'todo':
        return 'bg-gray-400'
      case 'cancelled':
        return 'bg-red-500'
      default:
        return 'bg-gray-400'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />
      case 'active':
      case 'in_progress':
        return <TrendingUp className="h-5 w-5 text-blue-600" />
      case 'planning':
      case 'todo':
        return <Circle className="h-5 w-5 text-gray-500" />
      case 'cancelled':
        return <AlertCircle className="h-5 w-5 text-red-600" />
      default:
        return <Clock className="h-5 w-5 text-gray-500" />
    }
  }

  const getTasksForMilestone = (milestoneId: string): Task[] => {
    return project.tasks.filter(task => task.milestone_id === milestoneId)
  }

  const calculateDaysRemaining = (dueDate: string): number => {
    const today = new Date()
    const due = new Date(dueDate)
    const diffTime = due.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const getDaysRemainingText = (dueDate: string): { text: string; color: string } => {
    const days = calculateDaysRemaining(dueDate)
    if (days < 0) {
      return { text: `${Math.abs(days)} days overdue`, color: 'text-red-600' }
    } else if (days === 0) {
      return { text: 'Due today', color: 'text-orange-600' }
    } else if (days <= 7) {
      return { text: `${days} days left`, color: 'text-orange-600' }
    } else {
      return { text: `${days} days left`, color: 'text-muted-foreground' }
    }
  }

  if (!project.milestones || project.milestones.length === 0) {
    return (
      <Card className={cn('h-full flex flex-col', className)}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Timeline</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-2">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">No milestones yet</p>
            <p className="text-sm text-muted-foreground">Add milestones to see your timeline</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('h-full flex flex-col', className)}>
      <CardHeader className="flex-shrink-0 pb-4">
        <CardTitle className="flex items-center space-x-2">
          <Calendar className="h-5 w-5" />
          <span className="text-lg">Project Timeline</span>
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          {project.milestones.length} milestone{project.milestones.length !== 1 ? 's' : ''} • {project.tasks.length} task{project.tasks.length !== 1 ? 's' : ''}
        </p>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="relative">
          {/* Vertical timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

          {/* Milestones */}
          <div className="space-y-6">
            {project.milestones.map((milestone, index) => {
              const isExpanded = expandedMilestones.has(milestone.id)
              const milestoneTasks = getTasksForMilestone(milestone.id)
              const daysInfo = getDaysRemainingText(milestone.due_date)

              return (
                <motion.div
                  key={milestone.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="relative pl-10"
                >
                  {/* Timeline dot */}
                  <div className={cn(
                    'absolute left-0 top-2 w-8 h-8 rounded-full flex items-center justify-center bg-background border-2',
                    milestone.status === 'completed' ? 'border-green-500' :
                    milestone.status === 'active' ? 'border-blue-500' :
                    'border-gray-400'
                  )}>
                    {getStatusIcon(milestone.status)}
                  </div>

                  {/* Milestone card */}
                  <Card
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => toggleMilestone(milestone.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-base truncate">
                              {milestone.name}
                            </h3>
                            {milestoneTasks.length > 0 && (
                              <motion.div
                                animate={{ rotate: isExpanded ? 90 : 0 }}
                                transition={{ duration: 0.2 }}
                              >
                                <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              </motion.div>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3 flex-wrap">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(milestone.start_date)}
                            </span>
                            <span>→</span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(milestone.due_date)}
                            </span>
                          </div>

                          {/* Progress bar */}
                          {milestone.progress_percentage !== undefined && (
                            <div className="space-y-1 mb-3">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">Progress</span>
                                <span className="font-medium">{milestone.progress_percentage}%</span>
                              </div>
                              <Progress value={milestone.progress_percentage} className="h-2" />
                            </div>
                          )}

                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant={milestone.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                              {milestone.status}
                            </Badge>
                            {milestoneTasks.length > 0 && (
                              <span className="text-xs text-muted-foreground">
                                {milestoneTasks.filter(t => t.status === 'completed').length}/{milestoneTasks.length} tasks
                              </span>
                            )}
                            <span className={cn('text-xs font-medium', daysInfo.color)}>
                              {daysInfo.text}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Expandable tasks */}
                      <AnimatePresence>
                        {isExpanded && milestoneTasks.length > 0 && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-4 pt-4 border-t space-y-2">
                              {milestoneTasks.map((task, taskIndex) => (
                                <motion.div
                                  key={task.id}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: taskIndex * 0.05 }}
                                  className="flex items-start gap-3 p-2 rounded-lg bg-muted/50"
                                >
                                  <div className="flex-shrink-0 mt-0.5">
                                    {task.status === 'completed' ? (
                                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                                    ) : task.status === 'in_progress' ? (
                                      <TrendingUp className="h-4 w-4 text-blue-600" />
                                    ) : (
                                      <Circle className="h-4 w-4 text-gray-400" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className={cn(
                                      'text-sm',
                                      task.status === 'completed' && 'line-through text-muted-foreground'
                                    )}>
                                      {task.name}
                                    </p>
                                    {task.due_date && (
                                      <p className="text-xs text-muted-foreground mt-1">
                                        Due: {formatDate(task.due_date)}
                                      </p>
                                    )}
                                  </div>
                                  <Badge
                                    variant="outline"
                                    className="text-xs flex-shrink-0"
                                  >
                                    {task.status.replace('_', ' ')}
                                  </Badge>
                                </motion.div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default MobileTimelineView
