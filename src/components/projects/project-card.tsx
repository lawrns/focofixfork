'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Calendar,
  Users,
  MoreVertical,
  Edit,
  Trash2,
  Eye
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { useRealtime } from '@/lib/hooks/useRealtime'
import { motion } from 'framer-motion'

interface ProjectCardProps {
  project: {
    id: string
    name: string
    description: string | null
    status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled'
    priority: 'low' | 'medium' | 'high' | 'urgent'
    progress_percentage: number
    start_date: string | null
    due_date: string | null
    created_at: string
    organization_id: string
  }
  onEdit?: (projectId: string) => void
  onDelete?: (projectId: string) => void
  showActions?: boolean
}

const statusColors = {
  planning: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  on_hold: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  completed: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
}

const priorityColors = {
  low: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
  medium: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  urgent: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
}

export function ProjectCard({
  project,
  onEdit,
  onDelete,
  showActions = true
}: ProjectCardProps) {
  const [currentProject, setCurrentProject] = useState(project)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isUpdated, setIsUpdated] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  // Real-time updates for this project
  useRealtime(
    { projectId: project.id },
    (payload) => {
      if (payload.table === 'projects' && payload.new?.id === project.id) {
        if (payload.eventType === 'UPDATE') {
          setCurrentProject(payload.new)
          setIsUpdated(true)
          // Reset the updated indicator after 3 seconds
          setTimeout(() => setIsUpdated(false), 3000)
        } else if (payload.eventType === 'DELETE') {
          // Handle project deletion - could trigger a callback or hide the component
          console.log('Project deleted:', project.id)
        }
      }
    }
  )

  // Update local state when prop changes
  useEffect(() => {
    setCurrentProject(project)
  }, [project])

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null
    return new Date(dateString).toLocaleDateString()
  }

  const handleDelete = async () => {
    if (!onDelete) return

    setIsDeleting(true)
    setShowDeleteDialog(false)
    try {
      await onDelete(currentProject.id)
    } catch (error) {
      console.error('Failed to delete project:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const getStatusLabel = (status: string) => {
    return status.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  const getPriorityLabel = (priority: string) => {
    return priority.charAt(0).toUpperCase() + priority.slice(1)
  }

  return (
    <motion.div
      initial={false}
      animate={isUpdated ? { scale: [1, 1.02, 1] } : { scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={`hover:shadow-md transition-shadow duration-200 ${isUpdated ? 'ring-2 ring-primary/20' : ''}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <Link
                href={`/projects/${currentProject.id}`}
                className="block"
              >
                <h3 className="font-semibold text-lg leading-tight hover:text-primary transition-colors truncate">
                  {currentProject.name}
                </h3>
              </Link>
              {currentProject.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {currentProject.description}
                </p>
              )}
            </div>

          {showActions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/projects/${currentProject.id}`}>
                    <Eye className="mr-2 h-4 w-4" />
                    View Details
                  </Link>
                </DropdownMenuItem>
                {onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(currentProject.id)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Project
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                {onDelete && (
                  <DropdownMenuItem
                    onClick={() => setShowDeleteDialog(true)}
                    disabled={isDeleting}
                    className="text-red-600 dark:text-red-400"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {isDeleting ? 'Deleting...' : 'Delete Project'}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Status and Priority Badges */}
        <div className="flex flex-wrap gap-2">
          <Badge className={statusColors[currentProject.status]}>
            {getStatusLabel(currentProject.status)}
          </Badge>
          <Badge variant="outline" className={priorityColors[currentProject.priority]}>
            {getPriorityLabel(currentProject.priority)}
          </Badge>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{currentProject.progress_percentage}%</span>
          </div>
          <Progress value={currentProject.progress_percentage} className="h-2" />
        </div>

        {/* Dates */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {currentProject.start_date && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>Start: {formatDate(currentProject.start_date)}</span>
            </div>
          )}
          {currentProject.due_date && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>Due: {formatDate(currentProject.due_date)}</span>
            </div>
          )}
        </div>

        {/* Footer with action button */}
        <div className="pt-2">
          <Button asChild variant="outline" size="sm" className="w-full">
            <Link href={`/projects/${currentProject.id}`} className="flex items-center justify-center">
              <Eye className="mr-2 h-4 w-4" />
              View Project
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>

    {/* Delete Confirmation Dialog */}
    <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Project</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete &ldquo;{currentProject.name}&rdquo;? This action cannot be undone.
            All tasks, milestones, and data associated with this project will be permanently deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete Project
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </motion.div>
  )
}


