'use client'

import { useState, useEffect, useCallback } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { TaskCard } from './task-card'
import { PriorityIndicator } from './priority-indicator'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Loader2, Plus, Search, Trash2, GripVertical, Download } from 'lucide-react'
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
import { Task } from '../types'
import { useTaskExport } from '../hooks/use-task-export'

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
  const { exportTasks, isExporting } = useTaskExport()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [projectName, setProjectName] = useState<string>('')

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
      console.log('[TaskFetch] Fetching tasks for user', user.id, 'Project:', projectId, 'Filters:', { statusFilter, priorityFilter, assigneeFilter })
      setLoading(true)
      setError(null)

      // Build query parameters
      const params = new URLSearchParams()
      if (projectId) params.append('project_id', projectId)
      if (milestoneId) params.append('milestone_id', milestoneId)
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (priorityFilter !== 'all') params.append('priority', priorityFilter)
      if (assigneeFilter !== 'all') params.append('assignee_id', assigneeFilter)

      const response = await fetch(`/api/tasks?${params}`, {
        credentials: 'include', // Include cookies for session auth
      })

      if (!response.ok) {
        const errorBody = await response.text()
        console.error('[TaskFetch] Failed with status', response.status, 'Body:', errorBody)
        if (response.status === 403) {
          setError('Permission denied. You may not have access to view these tasks.')
        } else if (response.status === 401) {
          setError('Authentication required. Please sign in again.')
          window.location.reload()
        } else {
          throw new Error(`Failed to fetch tasks: ${response.status} - ${errorBody}`)
        }
        return
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
      console.log('[TaskUpdate] Attempting status change for task', taskId, 'to', newStatus, 'User:', user.id)
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for session auth
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        const errorBody = await response.text()
        console.error('[TaskUpdate] Failed with status', response.status, 'Body:', errorBody)
        if (response.status === 403) {
          toast.error('Permission denied. You may not have access to update this task.')
        } else if (response.status === 401) {
          toast.error('Authentication required. Please sign in again.')
          // Trigger re-auth
          window.location.reload()
        } else {
          throw new Error(`Failed to update task status: ${response.status} - ${errorBody}`)
        }
        return // Don't update local state on error
      }

      console.log('[TaskUpdate] Success for task', taskId)
      // Update local state
      setTasks(prev => prev.map(task =>
        task.id === taskId
          ? { ...task, status: newStatus as any, updated_at: new Date().toISOString() }
          : task
      ))

      toast.success('Task status updated')
      // Call optional callback
      onStatusChange?.(taskId, newStatus)
    } catch (err) {
      console.error('Error updating task status:', err)
      toast.error('Failed to update task. Please try again.')
      // Revert optimistic update if any
      await fetchTasks()
      throw err // Re-throw to let TaskCard handle the error
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    if (!user) return

    try {
      console.log('[TaskDelete] Deleting task', taskId, 'by user', user.id)
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
        credentials: 'include', // Include cookies for session auth
      })

      if (!response.ok) {
        const errorBody = await response.text()
        console.error('[TaskDelete] Failed with status', response.status, 'Body:', errorBody)
        if (response.status === 403) {
          toast.error('Permission denied. You may not have access to delete this task.')
        } else if (response.status === 401) {
          toast.error('Authentication required. Please sign in again.')
          window.location.reload()
        } else {
          throw new Error(`Failed to delete task: ${response.status} - ${errorBody}`)
        }
        return
      }

      console.log('[TaskDelete] Success for task', taskId)
      // Remove from local state
      setTasks(prev => prev.filter(t => t.id !== taskId))
      toast.success('Task deleted successfully')

      // Call optional callback
      onDeleteTask?.(taskId)
    } catch (err) {
      console.error('Error deleting task:', err)
      toast.error('Failed to delete task. Please try again.')
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

  const handleExport = async (format: 'csv' | 'json') => {
    if (!projectId) {
      toast.error('Project ID is required for export')
      return
    }

    await exportTasks({
      format,
      projectId,
      projectName: projectName || 'tasks',
      filters: {
        status: statusFilter !== 'all' ? statusFilter : undefined,
        priority: priorityFilter !== 'all' ? priorityFilter : undefined,
        assigneeId: assigneeFilter !== 'all' ? assigneeFilter : undefined,
      },
    })
  }

  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result

    // Dropped outside a droppable area
    if (!destination) return

    // Dropped in the same position
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return
    }

    // Get the task being dragged
    const taskId = draggableId
    const sourceStatus = source.droppableId as 'todo' | 'in_progress' | 'review' | 'done'
    const destStatus = destination.droppableId as 'todo' | 'in_progress' | 'review' | 'done'

    // Find the task
    const task = tasks.find(t => t.id === taskId)
    if (!task) return

    // If moving between columns, update status
    if (sourceStatus !== destStatus) {
      try {
        console.log('[TaskDrag] Moving task', taskId, 'from', sourceStatus, 'to', destStatus)
        // Optimistically update local state
        setTasks(prev => prev.map(t =>
          t.id === taskId
            ? { ...t, status: destStatus, updated_at: new Date().toISOString() }
            : t
        ))

        // Update on server
        const response = await fetch(`/api/tasks/${taskId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include', // Include cookies for session auth
          body: JSON.stringify({ status: destStatus }),
        })

        if (!response.ok) {
          const errorBody = await response.text()
          console.error('[TaskDrag] Failed with status', response.status, 'Body:', errorBody)
          if (response.status === 403) {
            toast.error('Permission denied. You may not have access to move this task.')
          } else if (response.status === 401) {
            toast.error('Authentication required. Please sign in again.')
            window.location.reload()
          } else {
            throw new Error(`Failed to move task: ${response.status} - ${errorBody}`)
          }
          return // Don't call callback on error
        }

        console.log('[TaskDrag] Success for task', taskId)
        toast.success('Task moved successfully')
        onStatusChange?.(taskId, destStatus)
      } catch (err) {
        console.error('Error updating task:', err)
        toast.error('Failed to move task. Please try again.')
        // Revert optimistic update
        await fetchTasks()
      }
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
        <span className="text-muted-foreground">Loading tasks...</span>
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
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Delete ({selectedTasks.size})
            </Button>
          )}

          {filteredTasks.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isExporting}
                  aria-label="Export tasks"
                >
                  <Download className="h-4 w-4 mr-2" aria-hidden="true" />
                  {isExporting ? 'Exporting...' : 'Export'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => handleExport('csv')}
                  disabled={isExporting}
                >
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleExport('json')}
                  disabled={isExporting}
                >
                  Export as JSON
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {showCreateButton && onCreateTask && (
            <Button onClick={onCreateTask} aria-label="Create new task">
              <Plus className="h-4 w-4" aria-hidden="true" />
              New Task
            </Button>
          )}
        </div>
      </div>

      {/* Filters - Responsive layout */}
      <div className="flex flex-col sm:flex-row gap-4 w-full">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            aria-label="Search tasks by title or description"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32 sm:w-auto" aria-label="Filter tasks by status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="todo">To Do</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="review">Review</SelectItem>
              <SelectItem value="done">Done</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-32 sm:w-auto" aria-label="Filter tasks by priority">
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

      {/* Task Grid - Kanban Style with Drag and Drop */}
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
              <Plus className="h-4 w-4" />
              Create First Task
            </Button>
          )}
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="w-full overflow-x-auto pb-4" style={{ WebkitOverflowScrolling: 'touch', overscrollBehaviorX: 'contain' }} role="region" aria-label="Task board with four columns - drag tasks to change status">
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
                <Droppable droppableId="todo">
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`space-y-3 min-h-[200px] p-2 rounded-lg transition-colors ${
                        snapshot.isDraggingOver ? 'bg-gray-100 dark:bg-gray-800' : ''
                      }`}
                    >
                      {groupedTasks.todo.map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`space-y-2 ${snapshot.isDragging ? 'opacity-50' : ''}`}
                            >
                              <div className="flex items-center gap-2">
                                <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted transition-colors" title="Drag to reorder">
                                  <GripVertical className="h-5 w-5 text-foreground" aria-label="Drag to reorder" />
                                </div>
                                <Checkbox
                                  checked={selectedTasks.has(task.id)}
                                  onCheckedChange={(checked) => handleSelectTask(task.id, checked as boolean)}
                                  aria-label={`Select ${task.title}`}
                                />
                              </div>
                              <TaskCard
                                task={{
                                  ...task,
                                  created_by: task.created_by || ''
                                }}
                                onEdit={onEditTask}
                                onStatusChange={handleStatusChange}
                                onDelete={handleDeleteTask}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
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
                <Droppable droppableId="in_progress">
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`space-y-3 min-h-[200px] p-2 rounded-lg transition-colors ${
                        snapshot.isDraggingOver ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                      }`}
                    >
                      {groupedTasks.in_progress.map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`space-y-2 ${snapshot.isDragging ? 'opacity-50' : ''}`}
                            >
                              <div className="flex items-center gap-2">
                                <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted transition-colors" title="Drag to reorder">
                                  <GripVertical className="h-5 w-5 text-foreground" aria-label="Drag to reorder" />
                                </div>
                                <Checkbox
                                  checked={selectedTasks.has(task.id)}
                                  onCheckedChange={(checked) => handleSelectTask(task.id, checked as boolean)}
                                  aria-label={`Select ${task.title}`}
                                />
                              </div>
                              <TaskCard
                                task={{
                                  ...task,
                                  created_by: task.created_by || ''
                                }}
                                onEdit={onEditTask}
                                onStatusChange={handleStatusChange}
                                onDelete={handleDeleteTask}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
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
                <Droppable droppableId="review">
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`space-y-3 min-h-[200px] p-2 rounded-lg transition-colors ${
                        snapshot.isDraggingOver ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''
                      }`}
                    >
                      {groupedTasks.review.map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`space-y-2 ${snapshot.isDragging ? 'opacity-50' : ''}`}
                            >
                              <div className="flex items-center gap-2">
                                <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted transition-colors" title="Drag to reorder">
                                  <GripVertical className="h-5 w-5 text-foreground" aria-label="Drag to reorder" />
                                </div>
                                <Checkbox
                                  checked={selectedTasks.has(task.id)}
                                  onCheckedChange={(checked) => handleSelectTask(task.id, checked as boolean)}
                                  aria-label={`Select ${task.title}`}
                                />
                              </div>
                              <TaskCard
                                task={{
                                  ...task,
                                  created_by: task.created_by || ''
                                }}
                                onEdit={onEditTask}
                                onStatusChange={handleStatusChange}
                                onDelete={handleDeleteTask}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
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
                <Droppable droppableId="done">
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`space-y-3 min-h-[200px] p-2 rounded-lg transition-colors ${
                        snapshot.isDraggingOver ? 'bg-green-50 dark:bg-green-900/20' : ''
                      }`}
                    >
                      {groupedTasks.done.map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`space-y-2 ${snapshot.isDragging ? 'opacity-50' : ''}`}
                            >
                              <div className="flex items-center gap-2">
                                <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted transition-colors" title="Drag to reorder">
                                  <GripVertical className="h-5 w-5 text-foreground" aria-label="Drag to reorder" />
                                </div>
                                <Checkbox
                                  checked={selectedTasks.has(task.id)}
                                  onCheckedChange={(checked) => handleSelectTask(task.id, checked as boolean)}
                                  aria-label={`Select ${task.title}`}
                                />
                              </div>
                              <TaskCard
                                task={{
                                  ...task,
                                  created_by: task.created_by || ''
                                }}
                                onEdit={onEditTask}
                                onStatusChange={handleStatusChange}
                                onDelete={handleDeleteTask}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            </div>
          </div>
        </DragDropContext>
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
              {isBulkDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}


