'use client'

import { useState, useEffect, useCallback } from 'react'
import { TaskCard } from './task-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, Plus, Search, Trash2 } from 'lucide-react'
import { useAuth } from '@/lib/hooks/use-auth'
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
import { toast } from 'sonner'

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

  // Bulk selection states
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set())
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false)
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)

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

      // Handle wrapped response structure: {success: true, data: {data: [...], pagination: {}}}
      let tasksData: Task[] = []
      if (data.success && data.data) {
        if (Array.isArray(data.data.data)) {
          tasksData = data.data.data
        } else if (Array.isArray(data.data)) {
          tasksData = data.data
        }
      } else if (Array.isArray(data.data)) {
        tasksData = data.data
      } else if (Array.isArray(data)) {
        tasksData = data
      }

      console.log('TaskList: loaded tasks:', tasksData.length)
      setTasks(tasksData)
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

  // Ensure tasks is always an array before filtering
  const safeTasks = Array.isArray(tasks) ? tasks : []
  const filteredTasks = safeTasks.filter(task => {
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

  const handleSelectTask = (taskId: string, checked: boolean) => {
    setSelectedTasks(prev => {
      const newSet = new Set(prev)
      if (checked) {
        newSet.add(taskId)
      } else {
        newSet.delete(taskId)
      }
      return newSet
    })
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTasks(new Set(filteredTasks.map(t => t.id)))
    } else {
      setSelectedTasks(new Set())
    }
  }

  const handleBulkDelete = async () => {
    if (selectedTasks.size === 0) return

    setIsBulkDeleting(true)
    try {
      const deletePromises = Array.from(selectedTasks).map(taskId =>
        fetch(`/api/tasks/${taskId}`, { method: 'DELETE' })
      )

      const results = await Promise.allSettled(deletePromises)

      const successCount = results.filter(r => r.status === 'fulfilled').length
      const failCount = results.filter(r => r.status === 'rejected').length

      // Remove successfully deleted tasks from state
      setTasks(prev => prev.filter(t => !selectedTasks.has(t.id)))
      setSelectedTasks(new Set())

      if (failCount > 0) {
        toast.error(`Deleted ${successCount} tasks, but ${failCount} failed`)
      } else {
        toast.success(`Successfully deleted ${successCount} task(s)`)
      }

      setShowBulkDeleteDialog(false)
    } catch (err) {
      console.error('Error bulk deleting tasks:', err)
      toast.error('Failed to delete tasks. Please try again.')
    } finally {
      setIsBulkDeleting(false)
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

  const allSelected = filteredTasks.length > 0 && selectedTasks.size === filteredTasks.length
  const someSelected = selectedTasks.size > 0 && selectedTasks.size < filteredTasks.length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Tasks</h2>
          <p className="text-muted-foreground">
            {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}
            {selectedTasks.size > 0 && ` (${selectedTasks.size} selected)`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedTasks.size > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowBulkDeleteDialog(true)}
              aria-label={`Delete ${selectedTasks.size} selected tasks`}
            >
              <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
              Delete ({selectedTasks.size})
            </Button>
          )}

          {showCreateButton && onCreateTask && (
            <Button onClick={onCreateTask} aria-label="Create new task">
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              New Task
            </Button>
          )}
        </div>
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
            aria-label="Search tasks by title or description"
          />
        </div>

        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32" aria-label="Filter tasks by status">
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
            <SelectTrigger className="w-32" aria-label="Filter tasks by priority">
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

      {/* Bulk Selection Toggle */}
      {filteredTasks.length > 0 && (
        <div className="flex items-center gap-2 pb-2">
          <Checkbox
            id="select-all"
            checked={allSelected}
            onCheckedChange={handleSelectAll}
            aria-label="Select all tasks"
          />
          <label
            htmlFor="select-all"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
          >
            {allSelected ? 'Deselect all' : someSelected ? 'Select all' : 'Select all'}
          </label>
        </div>
      )}

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
        <div className="w-full overflow-x-auto pb-4" role="region" aria-label="Task board with four columns">
          <div className="flex gap-6 min-w-max">
            {/* To Do Column */}
            <div className="flex-shrink-0 w-80 space-y-4" role="group" aria-labelledby="todo-heading">
              <div className="flex items-center gap-2 pb-2 border-b">
                <div className="w-2 h-2 rounded-full bg-gray-400" aria-hidden="true"></div>
                <h3 id="todo-heading" className="font-semibold text-foreground">To Do</h3>
                <span className="text-sm text-gray-200 dark:text-gray-200 bg-gray-600 dark:bg-gray-700 px-2 py-1 rounded" aria-label={`${groupedTasks.todo.length} tasks in To Do`}>
                  {groupedTasks.todo.length}
                </span>
              </div>
              <div className="space-y-3">
                {groupedTasks.todo.map((task) => (
                  <div key={task.id} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedTasks.has(task.id)}
                        onCheckedChange={(checked) => handleSelectTask(task.id, checked as boolean)}
                        aria-label={`Select ${task.title}`}
                      />
                    </div>
                    <TaskCard
                      task={task}
                      onEdit={onEditTask}
                      onStatusChange={handleStatusChange}
                      onDelete={handleDeleteTask}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* In Progress Column */}
            <div className="flex-shrink-0 w-80 space-y-4" role="group" aria-labelledby="in-progress-heading">
              <div className="flex items-center gap-2 pb-2 border-b border-blue-200 dark:border-blue-800">
                <div className="w-2 h-2 rounded-full bg-blue-500" aria-hidden="true"></div>
                <h3 id="in-progress-heading" className="font-semibold text-foreground">In Progress</h3>
                <span className="text-sm text-white dark:text-blue-200 bg-blue-600 dark:bg-blue-800 px-2 py-1 rounded" aria-label={`${groupedTasks.in_progress.length} tasks in In Progress`}>
                  {groupedTasks.in_progress.length}
                </span>
              </div>
              <div className="space-y-3">
                {groupedTasks.in_progress.map((task) => (
                  <div key={task.id} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedTasks.has(task.id)}
                        onCheckedChange={(checked) => handleSelectTask(task.id, checked as boolean)}
                        aria-label={`Select ${task.title}`}
                      />
                    </div>
                    <TaskCard
                      task={task}
                      onEdit={onEditTask}
                      onStatusChange={handleStatusChange}
                      onDelete={handleDeleteTask}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Review Column */}
            <div className="flex-shrink-0 w-80 space-y-4" role="group" aria-labelledby="review-heading">
              <div className="flex items-center gap-2 pb-2 border-b border-yellow-200 dark:border-yellow-800">
                <div className="w-2 h-2 rounded-full bg-yellow-500" aria-hidden="true"></div>
                <h3 id="review-heading" className="font-semibold text-foreground">Review</h3>
                <span className="text-sm text-white dark:text-yellow-200 bg-yellow-600 dark:bg-yellow-800 px-2 py-1 rounded" aria-label={`${groupedTasks.review.length} tasks in Review`}>
                  {groupedTasks.review.length}
                </span>
              </div>
              <div className="space-y-3">
                {groupedTasks.review.map((task) => (
                  <div key={task.id} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedTasks.has(task.id)}
                        onCheckedChange={(checked) => handleSelectTask(task.id, checked as boolean)}
                        aria-label={`Select ${task.title}`}
                      />
                    </div>
                    <TaskCard
                      task={task}
                      onEdit={onEditTask}
                      onStatusChange={handleStatusChange}
                      onDelete={handleDeleteTask}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Done Column */}
            <div className="flex-shrink-0 w-80 space-y-4" role="group" aria-labelledby="done-heading">
              <div className="flex items-center gap-2 pb-2 border-b border-green-200 dark:border-green-800">
                <div className="w-2 h-2 rounded-full bg-green-500" aria-hidden="true"></div>
                <h3 id="done-heading" className="font-semibold text-foreground">Done</h3>
                <span className="text-sm text-white dark:text-green-200 bg-green-600 dark:bg-green-800 px-2 py-1 rounded" aria-label={`${groupedTasks.done.length} tasks in Done`}>
                  {groupedTasks.done.length}
                </span>
              </div>
              <div className="space-y-3">
                {groupedTasks.done.map((task) => (
                  <div key={task.id} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedTasks.has(task.id)}
                        onCheckedChange={(checked) => handleSelectTask(task.id, checked as boolean)}
                        aria-label={`Select ${task.title}`}
                      />
                    </div>
                    <TaskCard
                      task={task}
                      onEdit={onEditTask}
                      onStatusChange={handleStatusChange}
                      onDelete={handleDeleteTask}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedTasks.size} task(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the selected tasks.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isBulkDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isBulkDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}


