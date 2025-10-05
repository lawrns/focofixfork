'use client'

import { useEffect, useState, useCallback } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Plus, MoreHorizontal } from 'lucide-react'
import { useAuth } from '@/lib/hooks/use-auth'

interface Task {
  id: string
  title: string
  description?: string
  status: 'todo' | 'in_progress' | 'review' | 'done'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  assignee_id?: string
  project_id: string
  milestone_id?: string
  due_date?: string
}

interface Column {
  id: 'todo' | 'in_progress' | 'review' | 'done'
  title: string
  tasks: Task[]
}

export function KanbanBoard() {
  const { user } = useAuth()
  const [columns, setColumns] = useState<Column[]>([
    { id: 'todo', title: 'To Do', tasks: [] },
    { id: 'in_progress', title: 'In Progress', tasks: [] },
    { id: 'review', title: 'Review', tasks: [] },
    { id: 'done', title: 'Done', tasks: [] },
  ])
  const [isLoading, setIsLoading] = useState(true)

  const loadTasks = useCallback(async () => {
    if (!user) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/tasks')

      if (response.ok) {
        const data = await response.json()
        const tasks: Task[] = data.data || []

        // Distribute tasks into columns
        setColumns(prevColumns => prevColumns.map(col => ({
          ...col,
          tasks: tasks.filter(task => task.status === col.id)
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

    // Update backend
    try {
      const response = await fetch(`/api/tasks/${draggableId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: destColumn.id }),
      })

      if (!response.ok) {
        // Revert on failure
        setColumns(columns)
        console.error('Failed to update task status')
      }
    } catch (error) {
      // Revert on failure
      setColumns(columns)
      console.error('Failed to update task:', error)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-500'
      case 'high':
        return 'bg-orange-500'
      case 'medium':
        return 'bg-yellow-500'
      case 'low':
        return 'bg-green-500'
      default:
        return 'bg-gray-500'
    }
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
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((column) => (
          <div key={column.id} className="flex-shrink-0 w-80">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-medium">
                      {column.title}
                    </CardTitle>
                    <CardDescription className="text-xs mt-1">
                      {column.tasks.length} task{column.tasks.length !== 1 ? 's' : ''}
                    </CardDescription>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Droppable droppableId={column.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`space-y-2 min-h-[200px] rounded-lg p-2 transition-colors ${
                        snapshot.isDraggingOver ? 'bg-muted/50' : ''
                      }`}
                    >
                      {column.tasks.map((task, index) => (
                        <Draggable
                          key={task.id}
                          draggableId={task.id}
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <Card
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`cursor-grab active:cursor-grabbing ${
                                snapshot.isDragging ? 'shadow-lg' : ''
                              }`}
                            >
                              <CardHeader className="p-4">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-medium text-sm truncate">
                                      {task.title}
                                    </h4>
                                    {task.description && (
                                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                        {task.description}
                                      </p>
                                    )}
                                  </div>
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                    <MoreHorizontal className="h-3 w-3" />
                                  </Button>
                                </div>

                                <div className="flex items-center gap-2 mt-3">
                                  <div
                                    className={`h-2 w-2 rounded-full ${getPriorityColor(
                                      task.priority
                                    )}`}
                                    title={`Priority: ${task.priority}`}
                                  />
                                  {task.due_date && (
                                    <span className="text-xs text-muted-foreground">
                                      Due: {new Date(task.due_date).toLocaleDateString()}
                                    </span>
                                  )}
                                  {task.assignee_id && (
                                    <Avatar className="h-6 w-6 ml-auto">
                                      <AvatarFallback className="text-xs">
                                        {task.assignee_id.slice(0, 2).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                  )}
                                </div>
                              </CardHeader>
                            </Card>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}

                      {column.tasks.length === 0 && (
                        <div className="text-center py-8 text-sm text-muted-foreground">
                          No tasks yet
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </DragDropContext>
  )
}
