'use client'

import { useState, useEffect, useCallback } from 'react'
import { TaskCard } from './task-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Plus, Search, Filter } from 'lucide-react'
import { useAuth } from '@/lib/hooks/use-auth'

interface Task {
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

interface TaskListProps {
  projectId?: string
  milestoneId?: string
  showCreateButton?: boolean
  onCreateTask?: () => void
  onEditTask?: (taskId: string) => void
  onStatusChange?: (taskId: string, newStatus: string) => void
  onDeleteTask?: (taskId: string) => void
  initialStatus?: string
  initialPriority?: string
  initialAssignee?: string
}

export function TaskList({
  projectId,
  milestoneId,
  showCreateButton = true,
  onCreateTask,
  onEditTask,
  onStatusChange,
  onDeleteTask,
  initialStatus,
  initialPriority,
  initialAssignee,
}: TaskListProps) {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState(initialStatus || 'all')
  const [priorityFilter, setPriorityFilter] = useState(initialPriority || 'all')
  const [assigneeFilter, setAssigneeFilter] = useState(initialAssignee || 'all')

  const fetchTasks = useCallback(async () => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      // Build query parameters
      const params = new URLSearchParams()
      if (projectId) params.append('project_id', projectId)
      if (milestoneId) params.append('milestone_id', milestoneId)
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (priorityFilter !== 'all') params.append('priority', priorityFilter)
      if (assigneeFilter !== 'all') params.append('assignee_id', assigneeFilter)

      const response = await fetch(`/api/tasks?${params}`)

      if (!response.ok) {
        throw new Error('Failed to fetch tasks')
      }

      const data = await response.json()
      setTasks(data.data || [])
    } catch (err) {
      console.error('Error fetching tasks:', err)
      setError('Failed to load tasks. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [user, projectId, milestoneId, statusFilter, priorityFilter, assigneeFilter])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (task.description && task.description.toLowerCase().includes(searchTerm.toLowerCase()))

    return matchesSearch
  })

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    if (!user) return

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        throw new Error('Failed to update task status')
      }

      // Update local state
      setTasks(prev => prev.map(task =>
        task.id === taskId
          ? { ...task, status: newStatus as any, updated_at: new Date().toISOString() }
          : task
      ))

      // Call optional callback
      onStatusChange?.(taskId, newStatus)
    } catch (err) {
      console.error('Error updating task status:', err)
      throw err // Re-throw to let TaskCard handle the error
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    if (!user) return

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete task')
      }

      // Remove from local state
      setTasks(prev => prev.filter(t => t.id !== taskId))

      // Call optional callback
      onDeleteTask?.(taskId)
    } catch (err) {
      console.error('Error deleting task:', err)
      throw err // Re-throw to let TaskCard handle the error
    }
  }

  // Group tasks by status for Kanban-style display
  const groupedTasks = {
    todo: filteredTasks.filter(task => task.status === 'todo'),
    in_progress: filteredTasks.filter(task => task.status === 'in_progress'),
    review: filteredTasks.filter(task => task.status === 'review'),
    done: filteredTasks.filter(task => task.status === 'done'),
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading tasks...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
        <Button onClick={fetchTasks} variant="outline">
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Tasks</h2>
          <p className="text-muted-foreground">
            {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}
          </p>
        </div>

        {showCreateButton && onCreateTask && (
          <Button onClick={onCreateTask}>
            <Plus className="mr-2 h-4 w-4" />
            New Task
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="todo">To Do</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="review">Review</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>

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
        </div>
      </div>

      {/* Task Grid - Kanban Style */}
      {filteredTasks.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-muted-foreground mb-4">
            {tasks.length === 0 ? (
              <>
                <p className="text-lg mb-2">No tasks found</p>
                <p>Get started by creating your first task</p>
              </>
            ) : (
              <>
                <p className="text-lg mb-2">No tasks match your filters</p>
                <p>Try adjusting your search or filters</p>
              </>
            )}
          </div>

          {showCreateButton && onCreateTask && tasks.length === 0 && (
            <Button onClick={onCreateTask}>
              <Plus className="mr-2 h-4 w-4" />
              Create First Task
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* To Do Column */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b">
              <div className="w-2 h-2 rounded-full bg-gray-400"></div>
              <h3 className="font-semibold">To Do</h3>
              <span className="text-sm text-muted-foreground bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                {groupedTasks.todo.length}
              </span>
            </div>
            <div className="space-y-3">
              {groupedTasks.todo.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onEdit={onEditTask}
                  onStatusChange={handleStatusChange}
                  onDelete={handleDeleteTask}
                />
              ))}
            </div>
          </div>

          {/* In Progress Column */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <h3 className="font-semibold">In Progress</h3>
              <span className="text-sm text-blue-800 dark:text-blue-200 bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">
                {groupedTasks.in_progress.length}
              </span>
            </div>
            <div className="space-y-3">
              {groupedTasks.in_progress.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onEdit={onEditTask}
                  onStatusChange={handleStatusChange}
                  onDelete={handleDeleteTask}
                />
              ))}
            </div>
          </div>

          {/* Review Column */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b">
              <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
              <h3 className="font-semibold">Review</h3>
              <span className="text-sm text-muted-foreground bg-yellow-100 dark:bg-yellow-900 px-2 py-1 rounded">
                {groupedTasks.review.length}
              </span>
            </div>
            <div className="space-y-3">
              {groupedTasks.review.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onEdit={onEditTask}
                  onStatusChange={handleStatusChange}
                  onDelete={handleDeleteTask}
                />
              ))}
            </div>
          </div>

          {/* Done Column */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <h3 className="font-semibold">Done</h3>
              <span className="text-sm text-muted-foreground bg-green-100 dark:bg-green-900 px-2 py-1 rounded">
                {groupedTasks.done.length}
              </span>
            </div>
            <div className="space-y-3">
              {groupedTasks.done.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onEdit={onEditTask}
                  onStatusChange={handleStatusChange}
                  onDelete={handleDeleteTask}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


