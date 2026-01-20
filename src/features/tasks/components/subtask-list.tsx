'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { GripVertical, Plus, Trash2, MoreVertical } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { SubtasksEmpty } from '@/components/empty-states/subtasks-empty'

interface Subtask {
  id: string
  title: string
  completed: boolean
  order?: number
}

interface SubtaskListProps {
  taskId: string
  subtasks: Subtask[]
  onAddSubtask: (title: string) => Promise<void>
  onToggleSubtask: (subtaskId: string, completed: boolean) => Promise<void>
  onDeleteSubtask: (subtaskId: string) => Promise<void>
  onReorderSubtasks: (subtasks: Subtask[]) => Promise<void>
  isLoading?: boolean
}

export function SubtaskList({
  taskId,
  subtasks,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
  onReorderSubtasks,
  isLoading = false,
}: SubtaskListProps) {
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [deleteSubtaskId, setDeleteSubtaskId] = useState<string | null>(null)
  const [draggedSubtaskId, setDraggedSubtaskId] = useState<string | null>(null)
  const [loadingSubtaskId, setLoadingSubtaskId] = useState<string | null>(null)

  const completedCount = subtasks.filter(s => s.completed).length
  const totalCount = subtasks.length

  const handleAddSubtask = async () => {
    const title = newSubtaskTitle.trim()

    if (!title) {
      return
    }

    if (title.length > 500) {
      return
    }

    setIsAdding(true)
    try {
      await onAddSubtask(title)
      setNewSubtaskTitle('')
    } catch (error) {
      console.error('Failed to add subtask:', error)
    } finally {
      setIsAdding(false)
    }
  }

  const handleToggleSubtask = async (subtaskId: string, currentCompleted: boolean) => {
    setLoadingSubtaskId(subtaskId)
    try {
      await onToggleSubtask(subtaskId, !currentCompleted)
    } catch (error) {
      console.error('Failed to toggle subtask:', error)
    } finally {
      setLoadingSubtaskId(null)
    }
  }

  const handleDeleteSubtask = async () => {
    if (!deleteSubtaskId) return

    try {
      await onDeleteSubtask(deleteSubtaskId)
      setDeleteSubtaskId(null)
    } catch (error) {
      console.error('Failed to delete subtask:', error)
    }
  }

  const handleDragStart = (subtaskId: string) => {
    setDraggedSubtaskId(subtaskId)
  }

  const handleDragEnd = () => {
    setDraggedSubtaskId(null)
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleAddSubtask()
    }
  }

  return (
    <div className="space-y-4">
      {/* Progress Indicator */}
      {totalCount > 0 && (
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {completedCount}/{totalCount} completed
          </Badge>
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${(completedCount / totalCount) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      )}

      {/* Subtask List */}
      {subtasks.length > 0 && (
        <div className="space-y-2 border rounded-lg p-3 bg-muted/30">
          {subtasks.map((subtask, index) => (
            <motion.div
              key={subtask.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className={cn(
                'flex items-center gap-2 p-2 rounded hover:bg-muted/50 transition-colors',
                draggedSubtaskId === subtask.id && 'opacity-50',
                subtask.completed && 'opacity-60'
              )}
              draggable
              onDragStart={() => handleDragStart(subtask.id)}
              onDragEnd={handleDragEnd}
            >
              {/* Drag Handle */}
              <div className="cursor-grab active:cursor-grabbing p-1 flex-shrink-0">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
              </div>

              {/* Checkbox */}
              <Checkbox
                checked={subtask.completed}
                onCheckedChange={() =>
                  handleToggleSubtask(subtask.id, subtask.completed)
                }
                disabled={loadingSubtaskId === subtask.id}
                aria-label={`Toggle subtask: ${subtask.title}`}
              />

              {/* Subtask Title */}
              <span
                className={cn(
                  'flex-1 text-sm',
                  subtask.completed && 'line-through text-muted-foreground'
                )}
              >
                {subtask.title}
              </span>

              {/* Delete Button */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    aria-label={`Actions for ${subtask.title}`}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => setDeleteSubtaskId(subtask.id)}
                    className="text-red-600 dark:text-red-400"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add Subtask Input */}
      <div className="flex gap-2">
        <Input
          placeholder="Add a subtask..."
          value={newSubtaskTitle}
          onChange={(e) => setNewSubtaskTitle(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isAdding || isLoading}
          className="text-sm"
          maxLength={500}
          aria-label="New subtask title"
        />
        <Button
          onClick={handleAddSubtask}
          disabled={isAdding || isLoading || !newSubtaskTitle.trim()}
          size="sm"
          aria-label="Add subtask"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Empty State */}
      {subtasks.length === 0 && !showAddInput && (
        <SubtasksEmpty onAddSubtask={() => setShowAddInput(true)} />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteSubtaskId} onOpenChange={() => setDeleteSubtaskId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Subtask?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The subtask will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSubtask}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
