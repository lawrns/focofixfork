'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { 
  CheckSquare, 
  Clock, 
  Calendar, 
  TrendingUp, 
  AlertTriangle, 
  Users, 
  Target,
  BarChart3,
  Plus,
  Eye,
  Edit
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Types
interface Task {
  id: string
  title: string
  description?: string
  status: 'todo' | 'in_progress' | 'done'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  due_date?: string
  assignee_name?: string
  project_name?: string
  progress_percentage?: number
}

interface Project {
  id: string
  name: string
  status: 'planning' | 'active' | 'on_hold' | 'completed'
  progress_percentage: number
  due_date?: string
  task_count?: number
  completed_tasks?: number
}

interface DashboardStats {
  totalTasks: number
  completedTasks: number
  overdueTasks: number
  totalProjects: number
  activeProjects: number
  completedProjects: number
}

// Widget Components
interface WidgetProps {
  className?: string
  children: React.ReactNode
}

export function Widget({ className, children }: WidgetProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn('h-full', className)}
    >
      {children}
    </motion.div>
  )
}

// Stats Overview Widget
interface StatsOverviewWidgetProps {
  stats: DashboardStats
  className?: string
}

export function StatsOverviewWidget({ stats, className }: StatsOverviewWidgetProps) {
  const taskCompletionRate = stats.totalTasks > 0 
    ? Math.round((stats.completedTasks / stats.totalTasks) * 100) 
    : 0

  const projectCompletionRate = stats.totalProjects > 0 
    ? Math.round((stats.completedProjects / stats.totalProjects) * 100) 
    : 0

  return (
    <Widget className={className}>
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Task Stats */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Tasks</span>
              <span className="text-sm font-semibold">{stats.totalTasks}</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-green-600">Completed</span>
                <span>{stats.completedTasks}</span>
              </div>
              <Progress value={taskCompletionRate} className="h-2" />
            </div>
            {stats.overdueTasks > 0 && (
              <div className="flex items-center justify-between text-xs text-red-600">
                <span>Overdue</span>
                <span>{stats.overdueTasks}</span>
              </div>
            )}
          </div>

          {/* Project Stats */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Projects</span>
              <span className="text-sm font-semibold">{stats.totalProjects}</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-blue-600">Active</span>
                <span>{stats.activeProjects}</span>
              </div>
              <Progress value={projectCompletionRate} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Widget>
  )
}

// Recent Tasks Widget
interface RecentTasksWidgetProps {
  tasks: Task[]
  onViewTask?: (taskId: string) => void
  onEditTask?: (taskId: string) => void
  className?: string
}

export function RecentTasksWidget({ tasks, onViewTask, onEditTask, className }: RecentTasksWidgetProps) {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300'
      case 'medium': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700/40 dark:text-gray-300'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done': return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
      case 'in_progress': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
      case 'todo': return 'bg-gray-100 text-gray-800 dark:bg-gray-700/40 dark:text-gray-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700/40 dark:text-gray-300'
    }
  }

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false
    return new Date(dueDate) < new Date() && new Date(dueDate).toDateString() !== new Date().toDateString()
  }

  return (
    <Widget className={className}>
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-primary" />
            Recent Tasks
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {tasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No tasks yet</p>
              <p className="text-xs">Create your first task to get started</p>
            </div>
          ) : (
            tasks.slice(0, 5).map((task) => (
              <motion.div
                key={task.id}
                className="flex items-start gap-3 p-3 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors"
                whileHover={{ scale: 1.02 }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-medium text-foreground truncate">
                      {task.title}
                    </h4>
                    <div className="flex gap-1 flex-shrink-0">
                      <Badge className={cn('text-xs', getPriorityColor(task.priority))}>
                        {task.priority}
                      </Badge>
                      <Badge className={cn('text-xs', getStatusColor(task.status))}>
                        {task.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                  
                  {task.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {task.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    {task.project_name && (
                      <span className="truncate">Project: {task.project_name}</span>
                    )}
                    {task.due_date && (
                      <span className={cn(
                        'flex items-center gap-1',
                        isOverdue(task.due_date) && 'text-red-600 font-medium'
                      )}>
                        <Calendar className="h-3 w-3" />
                        {new Date(task.due_date).toLocaleDateString()}
                      </span>
                    )}
                    {task.assignee_name && (
                      <div className="flex items-center gap-1">
                        <Avatar className="h-4 w-4">
                          <AvatarFallback className="text-xs">
                            {task.assignee_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate">{task.assignee_name}</span>
                      </div>
                    )}
                  </div>

                  {task.progress_percentage !== undefined && (
                    <div className="mt-2">
                      <Progress value={task.progress_percentage} className="h-1.5" />
                    </div>
                  )}
                </div>

                <div className="flex gap-1 flex-shrink-0">
                  {onViewTask && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewTask(task.id)}
                      className="h-7 w-7 p-0"
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                  )}
                  {onEditTask && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEditTask(task.id)}
                      className="h-7 w-7 p-0"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </CardContent>
      </Card>
    </Widget>
  )
}

// Upcoming Deadlines Widget
interface UpcomingDeadlinesWidgetProps {
  tasks: Task[]
  projects: Project[]
  onViewItem?: (id: string, type: 'task' | 'project') => void
  className?: string
}

export function UpcomingDeadlinesWidget({ tasks, projects, onViewItem, className }: UpcomingDeadlinesWidgetProps) {
  const getUpcomingItems = () => {
    const items: Array<{
      id: string
      title: string
      type: 'task' | 'project'
      due_date: string
      priority?: string
      status?: string
    }> = []

    // Add tasks with due dates
    tasks.forEach(task => {
      if (task.due_date) {
        items.push({
          id: task.id,
          title: task.title,
          type: 'task',
          due_date: task.due_date,
          priority: task.priority,
          status: task.status
        })
      }
    })

    // Add projects with due dates
    projects.forEach(project => {
      if (project.due_date) {
        items.push({
          id: project.id,
          title: project.name,
          type: 'project',
          due_date: project.due_date,
          status: project.status
        })
      }
    })

    // Sort by due date
    return items.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
  }

  const upcomingItems = getUpcomingItems().slice(0, 5)

  const getDaysUntilDue = (dueDate: string) => {
    const today = new Date()
    const due = new Date(dueDate)
    const diffTime = due.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const getUrgencyColor = (daysUntilDue: number) => {
    if (daysUntilDue < 0) return 'text-red-600'
    if (daysUntilDue <= 1) return 'text-orange-600'
    if (daysUntilDue <= 3) return 'text-yellow-600'
    return 'text-green-600'
  }

  return (
    <Widget className={className}>
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Upcoming Deadlines
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {upcomingItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No upcoming deadlines</p>
              <p className="text-xs">All caught up!</p>
            </div>
          ) : (
            upcomingItems.map((item) => {
              const daysUntilDue = getDaysUntilDue(item.due_date)
              const isOverdue = daysUntilDue < 0
              
              return (
                <motion.div
                  key={`${item.type}-${item.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors cursor-pointer"
                  whileHover={{ scale: 1.02 }}
                  onClick={() => onViewItem?.(item.id, item.type)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-medium text-foreground truncate">
                        {item.title}
                      </h4>
                      <Badge variant="outline" className="text-xs">
                        {item.type}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <span className={cn('text-xs font-medium', getUrgencyColor(daysUntilDue))}>
                        {isOverdue 
                          ? `${Math.abs(daysUntilDue)} days overdue`
                          : daysUntilDue === 0 
                            ? 'Due today'
                            : `${daysUntilDue} days left`
                        }
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(item.due_date).toLocaleDateString()}
                      </span>
                    </div>

                    {item.priority && (
                      <Badge className={cn('text-xs mt-1', 
                        item.priority === 'urgent' && 'bg-red-100 text-red-800',
                        item.priority === 'high' && 'bg-orange-100 text-orange-800',
                        item.priority === 'medium' && 'bg-blue-100 text-blue-800',
                        item.priority === 'low' && 'bg-green-100 text-green-800'
                      )}>
                        {item.priority}
                      </Badge>
                    )}
                  </div>
                </motion.div>
              )
            })
          )}
        </CardContent>
      </Card>
    </Widget>
  )
}

// Active Projects Widget
interface ActiveProjectsWidgetProps {
  projects: Project[]
  onViewProject?: (projectId: string) => void
  onEditProject?: (projectId: string) => void
  className?: string
}

export function ActiveProjectsWidget({ projects, onViewProject, onEditProject, className }: ActiveProjectsWidgetProps) {
  const activeProjects = projects.filter(p => p.status === 'active')

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
      case 'planning': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
      case 'on_hold': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
      case 'completed': return 'bg-gray-100 text-gray-800 dark:bg-gray-700/40 dark:text-gray-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700/40 dark:text-gray-300'
    }
  }

  return (
    <Widget className={className}>
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Active Projects
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {activeProjects.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Target className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No active projects</p>
              <p className="text-xs">Start a new project to get going</p>
            </div>
          ) : (
            activeProjects.slice(0, 5).map((project) => (
              <motion.div
                key={project.id}
                className="flex items-start gap-3 p-3 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors"
                whileHover={{ scale: 1.02 }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-medium text-foreground truncate">
                      {project.name}
                    </h4>
                    <Badge className={cn('text-xs', getStatusColor(project.status))}>
                      {project.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    {project.task_count !== undefined && (
                      <span>
                        {project.completed_tasks || 0} / {project.task_count} tasks
                      </span>
                    )}
                    {project.due_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(project.due_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <span>Progress</span>
                      <span>{project.progress_percentage}%</span>
                    </div>
                    <Progress value={project.progress_percentage} className="h-2" />
                  </div>
                </div>

                <div className="flex gap-1 flex-shrink-0">
                  {onViewProject && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewProject(project.id)}
                      className="h-7 w-7 p-0"
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                  )}
                  {onEditProject && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEditProject(project.id)}
                      className="h-7 w-7 p-0"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </CardContent>
      </Card>
    </Widget>
  )
}

// Quick Actions Widget
interface QuickActionsWidgetProps {
  onCreateTask?: () => void
  onCreateProject?: () => void
  onCreateMilestone?: () => void
  className?: string
}

export function QuickActionsWidget({ 
  onCreateTask, 
  onCreateProject, 
  onCreateMilestone, 
  className 
}: QuickActionsWidgetProps) {
  const actions = [
    {
      label: 'New Task',
      icon: CheckSquare,
      onClick: onCreateTask,
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    {
      label: 'New Project',
      icon: Target,
      onClick: onCreateProject,
      color: 'bg-green-500 hover:bg-green-600'
    },
    {
      label: 'New Milestone',
      icon: Calendar,
      onClick: onCreateMilestone,
      color: 'bg-purple-500 hover:bg-purple-600'
    }
  ]

  return (
    <Widget className={className}>
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {actions.map((action) => (
            <motion.div
              key={action.label}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-12"
                onClick={action.onClick}
              >
                <div className={cn('p-2 rounded-md text-white', action.color)}>
                  <action.icon className="h-4 w-4" />
                </div>
                <span className="font-medium">{action.label}</span>
              </Button>
            </motion.div>
          ))}
        </CardContent>
      </Card>
    </Widget>
  )
}

// Export all widgets
export {
  type Task,
  type Project,
  type DashboardStats
}

