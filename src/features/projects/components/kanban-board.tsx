'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, MoreHorizontal, X, Check, GripVertical, MessageSquare, Paperclip, Calendar } from 'lucide-react'
import { useAuth } from '@/lib/hooks/use-auth'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface Task {
  id: string
  title: string
  description?: string
  status: 'todo' | 'in_progress' | 'review' | 'done'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  assignee_id?: string
  assignee_name?: string
  assignee_avatar?: string
  project_id: string
  milestone_id?: string
  due_date?: string
  comment_count?: number
  attachment_count?: number
}

interface Column {
  id: 'todo' | 'in_progress' | 'review' | 'done'
  title: string
  tasks: Task[]
}

export function KanbanBoard() {
  const { user } = useAuth()
  const router = useRouter()
  const [columns, setColumns] = useState<Column[]>([
    { id: 'todo', title: 'To Do', tasks: [] },
    { id: 'in_progress', title: 'In Progress', tasks: [] },
    { id: 'review', title: 'Review', tasks: [] },
    { id: 'done', title: 'Done', tasks: [] },
  ])
  const [isLoading, setIsLoading] = useState(true)
  const [addingToColumn, setAddingToColumn] = useState<string | null>(null)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const loadTasks = useCallback(async () => {
    if (!user) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/tasks')

      if (response.ok) {
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

        console.log('KanbanBoard: loaded tasks:', tasksData.length)

        // Distribute tasks into columns
        setColumns(prevColumns => prevColumns.map(col => ({
          ...col,
          tasks: tasksData.filter(task => task.status === col.id)
        })))
      } else {
        console.error('Failed to fetch tasks')
      }
    } catch (error) {
      console.error('Failed to load tasks:', error)
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  // Focus input when adding mode is activated
  useEffect(() => {
    if (addingToColumn && inputRef.current) {
      inputRef.current.focus()
    }
  }, [addingToColumn])

  const handleCreateTask = async (columnId: string) => {
    if (!newTaskTitle.trim() || isCreating) return

    setIsCreating(true)
    try {
      // Get the first available project for the user
      const projectsResponse = await fetch('/api/projects?limit=1')
      const projectsData = await projectsResponse.json()

      let firstProjectId = null
      if (projectsData.success && projectsData.data) {
        const projects = Array.isArray(projectsData.data.data)
          ? projectsData.data.data
          : Array.isArray(projectsData.data)
          ? projectsData.data
          : []
        firstProjectId = projects[0]?.id
      }

      if (!firstProjectId) {
        toast.error('No project available. Please create a project first.')
        setIsCreating(false)
        return
      }

      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: newTaskTitle.trim(),
          status: columnId,
          priority: 'medium',
          project_id: firstProjectId,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create task')
      }

      const result = await response.json()
      const newTask = result.data || result

      // Add task to the column optimistically
      setColumns(prevColumns =>
        prevColumns.map(col =>
          col.id === columnId
            ? { ...col, tasks: [...col.tasks, newTask] }
            : col
        )
      )

      // Reset form
      setNewTaskTitle('')
      setAddingToColumn(null)
      toast.success('Task created successfully')
    } catch (error) {
      console.error('Failed to create task:', error)
      toast.error('Failed to create task')
    } finally {
      setIsCreating(false)
    }
  }

  const handleCancelAdd = () => {
    setAddingToColumn(null)
    setNewTaskTitle('')
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

    // Find source and destination columns
    const sourceColumn = columns.find(col => col.id === source.droppableId)
    const destColumn = columns.find(col => col.id === destination.droppableId)

    if (!sourceColumn || !destColumn) return

    // Remove task from source column
    const sourceTask = sourceColumn.tasks[source.index]
    const newSourceTasks = Array.from(sourceColumn.tasks)
    newSourceTasks.splice(source.index, 1)

    // Add task to destination column
    const newDestTasks = Array.from(destColumn.tasks)
    const updatedTask = { ...sourceTask, status: destColumn.id }
    newDestTasks.splice(destination.index, 0, updatedTask)

    // Update state optimistically
    const newColumns = columns.map(col => {
      if (col.id === source.droppableId) {
        return { ...col, tasks: newSourceTasks }
      }
      if (col.id === destination.droppableId) {
        return { ...col, tasks: newDestTasks }
      }
      return col
    })

    setColumns(newColumns)

    // Update backend with both status and position
    try {
      const response = await fetch(`/api/tasks/${draggableId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          status: destColumn.id,
          position: destination.index,
          // TODO: Backend should support column_order field for persistent ordering
        }),
      })

      if (!response.ok) {
        // Revert on failure
        setColumns(columns)
        toast.error('Failed to update task position')
        console.error('Failed to update task status')
      }
    } catch (error) {
      // Revert on failure
      setColumns(columns)
      toast.error('Failed to update task position')
      console.error('Failed to update task:', error)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'border-l-red-500'
      case 'high':
        return 'border-l-orange-500'
      case 'medium':
        return 'border-l-yellow-500'
      case 'low':
        return 'border-l-green-500'
      default:
        return 'border-l-gray-500'
    }
  }

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const handleCardClick = (taskId: string) => {
    router.push(`/tasks/${taskId}`)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const diffTime = date.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Tomorrow'
    if (diffDays === -1) return 'Yesterday'
    if (diffDays > 0 && diffDays <= 7) return `In ${diffDays} days`
    if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 md:gap-6 overflow-x-auto pb-4 h-full" role="region" aria-label="Kanban board">
        {columns.map((column) => (
          <div key={column.id} className="flex-shrink-0 w-72 md:w-80 flex flex-col h-full">
            {/* Column Container */}
            <div className="flex-1 bg-zinc-50 dark:bg-zinc-900 rounded-lg p-4 border border-zinc-100 dark:border-zinc-800 overflow-hidden flex flex-col">
              {/* Column Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {column.title}
                  </h3>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-200 dark:bg-zinc-700 px-2 py-0.5 rounded-full font-medium" aria-label={`${column.tasks.length} tasks in ${column.title}`}>
                    {column.tasks.length}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAddingToColumn(column.id)}
                  className="h-6 w-6 p-0 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                  title={`Add task to ${column.title}`}
                  aria-label={`Add new task to ${column.title}`}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Column Content */}
              <div className="flex-1 overflow-hidden">
              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`h-full overflow-y-auto space-y-2 rounded-md p-1 transition-all duration-150 ${
                      snapshot.isDraggingOver
                        ? 'border-2 border-dashed border-zinc-300 dark:border-zinc-600 bg-zinc-100/50 dark:bg-zinc-800/50'
                        : 'border-2 border-transparent'
                    }`}
                    role="region"
                    aria-label={`${column.title} column with ${column.tasks.length} tasks`}
                  >
                    {column.tasks.map((task, index) => (
                      <Draggable
                        key={task.id}
                        draggableId={task.id}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`group relative bg-white dark:bg-zinc-900 rounded-md p-3 border cursor-pointer transition-all duration-150 ${
                              snapshot.isDragging
                                ? 'shadow-lg scale-[1.02] rotate-1 border-zinc-300 dark:border-zinc-600'
                                : 'border-zinc-100 dark:border-zinc-800 hover:border-zinc-200 dark:hover:border-zinc-700 hover:shadow-sm'
                            } ${getPriorityColor(task.priority)} border-l-4`}
                            onClick={() => handleCardClick(task.id)}
                            role="article"
                            aria-label={`Task: ${task.title}. Priority: ${task.priority}. ${task.description ? `Description: ${task.description}` : ''} ${task.assignee_name ? `Assigned to: ${task.assignee_name}` : ''}`}
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                handleCardClick(task.id)
                              }
                            }}
                          >
                            {/* Drag Handle - Only visible on hover */}
                            <div
                              {...provided.dragHandleProps}
                              className="absolute left-1 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                              aria-label="Drag handle"
                            >
                              <GripVertical className="h-4 w-4 text-zinc-400" />
                            </div>

                            <div className="pl-4">
                              {/* Card Header */}
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-medium text-sm text-zinc-900 dark:text-zinc-100 leading-5">
                                    {task.title}
                                  </h4>
                                  {task.description && (
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">
                                      {task.description}
                                    </p>
                                  )}
                                </div>

                                {/* Menu Button - Only visible on hover */}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0 text-zinc-400 hover:text-zinc-600"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    // TODO: Open context menu
                                  }}
                                  aria-label={`Task options for ${task.title}`}
                                >
                                  <MoreHorizontal className="h-3 w-3" />
                                </Button>
                              </div>

                              {/* Card Footer - Metadata */}
                              <div className="flex items-center gap-2 flex-wrap">
                                {/* Priority Badge */}
                                <Badge
                                  variant="outline"
                                  className={`text-xs ${getPriorityBadgeColor(task.priority)}`}
                                  aria-label={`Priority: ${task.priority}`}
                                >
                                  {task.priority}
                                </Badge>

                                {/* Due Date */}
                                {task.due_date && (
                                  <div className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400" aria-label={`Due date: ${formatDate(task.due_date)}`}>
                                    <Calendar className="h-3 w-3" aria-hidden="true" />
                                    <span>{formatDate(task.due_date)}</span>
                                  </div>
                                )}

                                {/* Comments */}
                                {task.comment_count && task.comment_count > 0 && (
                                  <div className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400" aria-label={`${task.comment_count} comments`}>
                                    <MessageSquare className="h-3 w-3" aria-hidden="true" />
                                    <span>{task.comment_count}</span>
                                  </div>
                                )}

                                {/* Attachments */}
                                {task.attachment_count && task.attachment_count > 0 && (
                                  <div className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400" aria-label={`${task.attachment_count} attachments`}>
                                    <Paperclip className="h-3 w-3" aria-hidden="true" />
                                    <span>{task.attachment_count}</span>
                                  </div>
                                )}

                                {/* Assignee */}
                                {task.assignee_id && (
                                  <div className="ml-auto" aria-label={`Assigned to: ${task.assignee_name || task.assignee_id}`}>
                                    <Avatar className="h-6 w-6">
                                      <AvatarFallback className="text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                                        {task.assignee_name?.slice(0, 2).toUpperCase() ||
                                         task.assignee_id.slice(0, 2).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}

                    {/* Inline task creation form */}
                    {addingToColumn === column.id && (
                      <div className="bg-white dark:bg-zinc-900 rounded-md border-2 border-zinc-300 dark:border-zinc-600" role="form" aria-label="Create new task">
                        <div className="p-3">
                          <Input
                            ref={inputRef}
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.target.value)}
                            placeholder="Enter task title..."
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleCreateTask(column.id)
                              } else if (e.key === 'Escape') {
                                handleCancelAdd()
                              }
                            }}
                            disabled={isCreating}
                            className="text-sm border-0 focus:ring-0 shadow-none resize-none bg-transparent"
                            autoFocus
                            aria-label="New task title"
                          />
                          <div className="flex gap-2 mt-3">
                            <Button
                              size="sm"
                              onClick={() => handleCreateTask(column.id)}
                              disabled={isCreating || !newTaskTitle.trim()}
                              className="flex-1 text-sm"
                              aria-label="Create new task"
                            >
                              <Check className="h-3 w-3 mr-1" aria-hidden="true" />
                              {isCreating ? 'Creating...' : 'Add Task'}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={handleCancelAdd}
                              disabled={isCreating}
                              aria-label="Cancel task creation"
                            >
                              <X className="h-3 w-3" aria-hidden="true" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Empty State */}
                    {column.tasks.length === 0 && addingToColumn !== column.id && (
                      <button
                        onClick={() => setAddingToColumn(column.id)}
                        className="w-full p-3 border-2 border-dashed border-zinc-300 dark:border-zinc-600 rounded-md text-sm text-zinc-500 dark:text-zinc-400 hover:border-zinc-400 dark:hover:border-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-all duration-150"
                        aria-label={`Add task to ${column.title} column`}
                      >
                        + Add task
                      </button>
                    )}
                  </div>
                )}
              </Droppable>
              </div>
            </div>
          </div>
        ))}
      </div>
    </DragDropContext>
  )
}
