'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { Checkbox } from '@/components/ui/checkbox'
import {
  ChevronDown,
  Trash2,
  CheckCircle,
  Flag,
  Users,
  FolderOpen,
  Tag,
  X,
  Loader2,
} from 'lucide-react'
import { useBatchOperations } from '../hooks/use-batch-operations'

interface BatchToolbarProps {
  selectedCount: number
  tasks?: any[]
  projects?: any[]
  users?: any[]
  onSelectAll?: (checked: boolean) => void
  onClearSelection?: () => void
  onTasksUpdated?: (tasks: any[]) => void
  filteredTaskCount?: number
}

export function BatchToolbar({
  selectedCount,
  tasks = [],
  projects = [],
  users = [],
  onSelectAll,
  onClearSelection,
  onTasksUpdated,
  filteredTaskCount = 0,
}: BatchToolbarProps) {
  const { performBatchOperation, isLoading } = useBatchOperations()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([])

  // Derive selected task IDs from tasks
  const getSelectedTaskIds = () => {
    return tasks
      .filter(task => task.isSelected)
      .map(task => task.id)
  }

  const handleComplete = async () => {
    const taskIds = getSelectedTaskIds()
    const result = await performBatchOperation(taskIds, 'complete')

    if (result.success && onTasksUpdated) {
      onTasksUpdated(result.data?.tasks || [])
    }
    onClearSelection?.()
  }

  const handlePriorityChange = async (priority: 'low' | 'medium' | 'high' | 'urgent') => {
    const taskIds = getSelectedTaskIds()
    const result = await performBatchOperation(taskIds, 'priority', priority)

    if (result.success && onTasksUpdated) {
      onTasksUpdated(result.data?.tasks || [])
    }
    onClearSelection?.()
  }

  const handleMoveToProject = async (projectId: string) => {
    const taskIds = getSelectedTaskIds()
    const result = await performBatchOperation(taskIds, 'move', projectId)

    if (result.success && onTasksUpdated) {
      onTasksUpdated(result.data?.tasks || [])
    }
    onClearSelection?.()
  }

  const handleAssignTo = async (userId: string | null) => {
    const taskIds = getSelectedTaskIds()
    const result = await performBatchOperation(taskIds, 'assign', userId)

    if (result.success && onTasksUpdated) {
      onTasksUpdated(result.data?.tasks || [])
    }
    onClearSelection?.()
  }

  const handleAddTags = async (tags: string[]) => {
    const taskIds = getSelectedTaskIds()
    const result = await performBatchOperation(taskIds, 'tag', tags)

    if (result.success && onTasksUpdated) {
      onTasksUpdated(result.data?.tasks || [])
    }
    onClearSelection?.()
  }

  const handleDelete = async () => {
    const taskIds = getSelectedTaskIds()
    const result = await performBatchOperation(taskIds, 'delete')

    if (result.success) {
      const deletedIds = new Set(taskIds)
      const remaining = tasks.filter(t => !deletedIds.has(t.id))
      if (onTasksUpdated) {
        onTasksUpdated(remaining)
      }
    }
    onClearSelection?.()
    setShowDeleteConfirm(false)
  }

  if (selectedCount === 0) {
    return null
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      >
        <div className="flex items-center justify-between gap-2 px-4 py-3">
          {/* Left section: Checkbox and Selection Info */}
          <div className="flex items-center gap-3">
            <Checkbox
              checked={selectedCount > 0 && selectedCount === filteredTaskCount}
              onCheckedChange={onSelectAll}
              aria-label="Select all tasks"
            />
            <span className="text-sm font-medium">
              {selectedCount} {selectedCount === 1 ? 'task' : 'tasks'} selected
            </span>
          </div>

          {/* Right section: Actions */}
          <div className="flex items-center gap-2">
            {/* Complete Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleComplete}
              disabled={isLoading}
              className="gap-2"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              <CheckCircle className="h-4 w-4" />
              Complete
            </Button>

            {/* More Actions Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isLoading}
                  className="gap-1"
                >
                  <span>Actions</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {/* Priority Submenu */}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="gap-2">
                    <Flag className="h-4 w-4" />
                    <span>Change Priority</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem onClick={() => handlePriorityChange('low')}>
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                        Low
                      </span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handlePriorityChange('medium')}>
                      <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                        Medium
                      </span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handlePriorityChange('high')}>
                      <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                        High
                      </span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handlePriorityChange('urgent')}>
                      <span className="text-xs font-medium text-red-600 dark:text-red-400">
                        Urgent
                      </span>
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>

                {/* Move to Project Submenu */}
                {projects.length > 0 && (
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="gap-2">
                      <FolderOpen className="h-4 w-4" />
                      <span>Move to Project</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      {projects.map(project => (
                        <DropdownMenuItem
                          key={project.id}
                          onClick={() => handleMoveToProject(project.id)}
                        >
                          {project.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                )}

                {/* Assign Submenu */}
                {users.length > 0 && (
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="gap-2">
                      <Users className="h-4 w-4" />
                      <span>Assign to</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      <DropdownMenuItem onClick={() => handleAssignTo(null)}>
                        Unassigned
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {users.map(user => (
                        <DropdownMenuItem
                          key={user.id}
                          onClick={() => handleAssignTo(user.id)}
                        >
                          {user.name || user.email}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                )}

                {/* Tags */}
                <DropdownMenuItem
                  className="gap-2"
                  onClick={() => toast.info('Bulk tag management coming soon')}
                >
                  <Tag className="h-4 w-4" />
                  <span>Add Tags</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {/* Delete */}
                <DropdownMenuItem
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-destructive focus:text-destructive gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Delete</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Close/Clear Selection */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearSelection}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedCount} tasks?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The selected tasks will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AnimatePresence>
  )
}
