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
  Edit,
  Mic
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
  inProgressTasks: number
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

// Individual Stat Card Component
interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: number
  subLabel?: string
  subValue?: number
  color?: 'blue' | 'green' | 'orange' | 'red'
  className?: string
}

function StatCard({ icon, label, value, subLabel, subValue, color = 'blue', className }: StatCardProps) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600 text-blue-600 dark:from-blue-400 dark:to-blue-500 dark:text-blue-400',
    green: 'from-green-500 to-green-600 text-green-600 dark:from-green-400 dark:to-green-500 dark:text-green-400',
    orange: 'from-orange-500 to-orange-600 text-orange-600 dark:from-orange-400 dark:to-orange-500 dark:text-orange-400',
    red: 'from-red-500 to-red-600 text-red-600 dark:from-red-400 dark:to-red-500 dark:text-red-400',
  }

  const bgColors = {
    blue: 'bg-gradient-to-br from-blue-500/10 to-blue-600/10 dark:from-blue-500/20 dark:to-blue-600/20 border-blue-200/50 dark:border-blue-700/50',
    green: 'bg-gradient-to-br from-green-500/10 to-green-600/10 dark:from-green-500/20 dark:to-green-600/20 border-green-200/50 dark:border-green-700/50',
    orange: 'bg-gradient-to-br from-orange-500/10 to-orange-600/10 dark:from-orange-500/20 dark:to-orange-600/20 border-orange-200/50 dark:border-orange-700/50',
    red: 'bg-gradient-to-br from-red-500/10 to-red-600/10 dark:from-red-500/20 dark:to-red-600/20 border-red-200/50 dark:border-red-700/50',
  }

  return (
    <Widget className={className}>
      <Card className={`h-full ${bgColors[color]} backdrop-blur-sm border-2 hover:shadow-lg transition-all duration-200`}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground mb-2">{label}</p>
              <p className="text-3xl font-bold text-foreground">{value}</p>
              {subLabel && subValue !== undefined && (
                <p className={`text-sm mt-3 font-medium bg-gradient-to-r ${colorClasses[color]} bg-clip-text text-transparent`}>
                  {subLabel}: {subValue}
                </p>
              )}
            </div>
            <div className={`bg-gradient-to-br ${colorClasses[color]} p-3 rounded-xl shadow-sm`}>
              {icon}
            </div>
          </div>
        </CardContent>
      </Card>
    </Widget>
  )
}

// Stats Overview Widget - renders 4 individual stat cards
interface StatsOverviewWidgetProps {
  stats: DashboardStats
}

export function StatsOverviewWidget({ stats }: StatsOverviewWidgetProps) {
  return (
    <>
      <StatCard
        icon={<CheckSquare className="h-8 w-8" />}
        label="Total Tasks"
        value={stats.totalTasks}
        subLabel="Completed"
        subValue={stats.completedTasks}
        color="green"
      />
      <StatCard
        icon={<Clock className="h-8 w-8" />}
        label="In Progress"
        value={stats.inProgressTasks}
        color="blue"
      />
      <StatCard
        icon={<AlertTriangle className="h-8 w-8" />}
        label="Overdue Tasks"
        value={stats.overdueTasks}
        color="red"
      />
      <StatCard
        icon={<Target className="h-8 w-8" />}
        label="Active Projects"
        value={stats.activeProjects}
        subLabel="Total"
        subValue={stats.totalProjects}
        color="orange"
      />
    </>
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
      case 'urgent': return 'bg-gradient-to-r from-red-500 to-red-600 text-white border border-red-200 dark:border-red-700 shadow-sm'
      case 'high': return 'bg-gradient-to-r from-orange-500 to-orange-600 text-white border border-orange-200 dark:border-orange-700 shadow-sm'
      case 'medium': return 'bg-gradient-to-r from-blue-500 to-blue-600 text-white border border-blue-200 dark:border-blue-700 shadow-sm'
      case 'low': return 'bg-gradient-to-r from-green-500 to-green-600 text-white border border-green-200 dark:border-green-700 shadow-sm'
      default: return 'bg-gradient-to-r from-gray-500 to-gray-600 text-white border border-gray-200 dark:border-gray-700 shadow-sm'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done': return 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white border border-emerald-200 dark:border-emerald-700 shadow-sm'
      case 'in_progress': return 'bg-gradient-to-r from-blue-500 to-blue-600 text-white border border-blue-200 dark:border-blue-700 shadow-sm'
      case 'todo': return 'bg-gradient-to-r from-slate-500 to-slate-600 text-white border border-slate-200 dark:border-slate-700 shadow-sm'
      default: return 'bg-gradient-to-r from-slate-500 to-slate-600 text-white border border-slate-200 dark:border-slate-700 shadow-sm'
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
                className="flex items-start gap-4 p-4 rounded-xl border border-border/80 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm hover:bg-white/80 dark:hover:bg-slate-900/80 hover:border-primary/30 hover:shadow-md transition-all duration-200"
                whileHover={{ scale: 1.01, y: -1 }}
              >
                <div className="flex-1 min-w-0 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="text-base font-semibold text-foreground leading-tight truncate">
                      {task.title}
                    </h4>
                    <div className="flex gap-2 flex-shrink-0">
                      <Badge className={cn('text-xs font-medium px-2.5 py-1', getPriorityColor(task.priority))}>
                        {task.priority}
                      </Badge>
                      <Badge className={cn('text-xs font-medium px-2.5 py-1', getStatusColor(task.status))}>
                        {task.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                  
                  {task.description && (
                    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                      {task.description}
                    </p>
                  )}

                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    {task.project_name && (
                      <span className="flex items-center gap-2 font-medium">
                        <Target className="h-4 w-4 text-primary" />
                        {task.project_name}
                      </span>
                    )}
                    {task.due_date && (
                      <span className={cn('flex items-center gap-2 font-medium', isOverdue(task.due_date) && 'text-destructive')}>
                        <Calendar className="h-4 w-4" />
                        {new Date(task.due_date).toLocaleDateString()}
                      </span>
                    )}
                    {task.assignee_name && (
                      <span className="flex items-center gap-2 font-medium">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs font-medium">
                            {task.assignee_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {task.assignee_name}
                      </span>
                    )}
                  </div>

                  {task.progress_percentage !== undefined && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm font-medium text-foreground">
                        <span>Progress</span>
                        <span className="text-primary">{task.progress_percentage}%</span>
                      </div>
                      <Progress value={task.progress_percentage} className="h-3" />
                    </div>
                  )}
                </div>

                <div className="flex gap-2 flex-shrink-0">
                  {onViewTask && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewTask(task.id)}
                      className="h-8 w-8 p-0 border-border/60 hover:border-primary hover:bg-primary/10"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                  {onEditTask && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEditTask(task.id)}
                      className="h-8 w-8 p-0 border-border/60 hover:border-primary hover:bg-primary/10"
                    >
                      <Edit className="h-4 w-4" />
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
      case 'active': return 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white border border-emerald-200 dark:border-emerald-700 shadow-sm'
      case 'planning': return 'bg-gradient-to-r from-blue-500 to-blue-600 text-white border border-blue-200 dark:border-blue-700 shadow-sm'
      case 'on_hold': return 'bg-gradient-to-r from-amber-500 to-amber-600 text-white border border-amber-200 dark:border-amber-700 shadow-sm'
      case 'completed': return 'bg-gradient-to-r from-slate-500 to-slate-600 text-white border border-slate-200 dark:border-slate-700 shadow-sm'
      default: return 'bg-gradient-to-r from-slate-500 to-slate-600 text-white border border-slate-200 dark:border-slate-700 shadow-sm'
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
            <div className="text-center py-12 text-muted-foreground">
              <Target className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-base font-medium">No active projects</p>
              <p className="text-sm">Start a new project to get going</p>
            </div>
          ) : (
            activeProjects.slice(0, 5).map((project) => (
              <motion.div
                key={project.id}
                className="flex items-start gap-4 p-4 rounded-xl border border-border/80 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm hover:bg-white/80 dark:hover:bg-slate-900/80 hover:border-primary/30 hover:shadow-md transition-all duration-200"
                whileHover={{ scale: 1.01, y: -1 }}
              >
                <div className="flex-1 min-w-0 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="text-base font-semibold text-foreground leading-tight truncate">
                      {project.name}
                    </h4>
                    <Badge className={cn('text-xs font-medium px-2.5 py-1', getStatusColor(project.status))}>
                      {project.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    {project.task_count !== undefined && (
                      <span className="flex items-center gap-2 font-medium">
                        <CheckSquare className="h-4 w-4 text-primary" />
                        {project.completed_tasks || 0} / {project.task_count} tasks
                      </span>
                    )}
                    {project.due_date && (
                      <span className="flex items-center gap-2 font-medium">
                        <Calendar className="h-4 w-4" />
                        {new Date(project.due_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm font-medium text-foreground">
                      <span>Progress</span>
                      <span className="text-primary">{project.progress_percentage}%</span>
                    </div>
                    <Progress value={project.progress_percentage} className="h-3" />
                  </div>
                </div>

                <div className="flex gap-2 flex-shrink-0">
                  {onViewProject && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewProject(project.id)}
                      className="h-8 w-8 p-0 border-border/60 hover:border-primary hover:bg-primary/10"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                  {onEditProject && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEditProject(project.id)}
                      className="h-8 w-8 p-0 border-border/60 hover:border-primary hover:bg-primary/10"
                    >
                      <Edit className="h-4 w-4" />
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
  onVoicePlanning?: () => void
  className?: string
}

export function QuickActionsWidget({ 
  onCreateTask, 
  onCreateProject, 
  onCreateMilestone, 
  onVoicePlanning,
  className 
}: QuickActionsWidgetProps) {
  const actions = [
    {
      label: 'Voice Planning',
      icon: Mic,
      onClick: onVoicePlanning,
      color: 'bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700'
    },
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

