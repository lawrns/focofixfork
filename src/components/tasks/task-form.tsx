'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/lib/hooks/use-auth'

const taskSchema = z.object({
  title: z.string().min(1, 'Task title is required').max(500, 'Title must be less than 500 characters'),
  description: z.string().max(2000, 'Description must be less than 2000 characters').optional(),
  project_id: z.string().min(1, 'Project is required'),
  milestone_id: z.string().optional(),
  status: z.enum(['todo', 'in_progress', 'review', 'done']).default('todo'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  assignee_id: z.string().optional(),
  estimated_hours: z.number().min(0).max(1000).optional(),
  actual_hours: z.number().min(0).max(1000).optional(),
  due_date: z.string().optional(),
})

type TaskFormData = z.infer<typeof taskSchema>

interface TaskFormProps {
  task?: TaskFormData & { id?: string }
  projects: Array<{ id: string; name: string }>
  milestones?: Array<{ id: string; title: string; project_id: string }>
  teamMembers?: Array<{ id: string; display_name: string }>
  onSuccess?: () => void
  onCancel?: () => void
}

export function TaskForm({
  task,
  projects,
  milestones = [],
  teamMembers = [],
  onSuccess,
  onCancel
}: TaskFormProps) {
  const { user } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: task?.title || '',
      description: task?.description || '',
      project_id: task?.project_id || '',
      milestone_id: task?.milestone_id || '',
      status: task?.status || 'todo',
      priority: task?.priority || 'medium',
      assignee_id: task?.assignee_id || '',
      estimated_hours: task?.estimated_hours || undefined,
      actual_hours: task?.actual_hours || undefined,
      due_date: task?.due_date || '',
    },
  })

  const watchedProjectId = watch('project_id')
  const watchedStatus = watch('status')
  const watchedPriority = watch('priority')
  const watchedAssigneeId = watch('assignee_id')

  // Filter milestones by selected project
  const availableMilestones = milestones.filter(m => m.project_id === watchedProjectId)

  const isEditing = !!task?.id

  const onSubmit = async (data: any) => {
    if (!user) return

    setIsSubmitting(true)
    setError(null)

    try {
      // Clean up the data
      const submitData = {
        ...data,
        // Remove empty strings and convert to null
        milestone_id: data.milestone_id || null,
        assignee_id: data.assignee_id || null,
        estimated_hours: data.estimated_hours || null,
        actual_hours: data.actual_hours || null,
        due_date: data.due_date || null,
      }

      const url = isEditing ? `/api/tasks/${task.id}` : '/api/tasks'
      const method = isEditing ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify(submitData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save task')
      }

      onSuccess?.()
    } catch (err: any) {
      console.error('Task save error:', err)
      setError(err.message || 'An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    if (isDirty && !confirm('You have unsaved changes. Are you sure you want to cancel?')) {
      return
    }
    onCancel?.()
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>
          {isEditing ? 'Edit Task' : 'Create New Task'}
        </CardTitle>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Task Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Task Title *</Label>
            <Input
              id="title"
              {...register('title')}
              placeholder="Enter task title"
              disabled={isSubmitting}
            />
            {errors.title && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {errors.title.message}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Describe the task in detail..."
              rows={3}
              disabled={isSubmitting}
            />
            {errors.description && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {errors.description.message}
              </p>
            )}
          </div>

          {/* Project */}
          <div className="space-y-2">
            <Label htmlFor="project">Project *</Label>
            <Select
              value={watchedProjectId}
              onValueChange={(value) => {
                setValue('project_id', value)
                // Clear milestone selection if project changes
                setValue('milestone_id', '')
              }}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.project_id && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {errors.project_id.message}
              </p>
            )}
          </div>

          {/* Milestone */}
          <div className="space-y-2">
            <Label htmlFor="milestone">Milestone (Optional)</Label>
            <Select
              value={watch('milestone_id') || ''}
              onValueChange={(value) => setValue('milestone_id', value)}
              disabled={isSubmitting || !watchedProjectId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select milestone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No milestone</SelectItem>
                {availableMilestones.map((milestone) => (
                  <SelectItem key={milestone.id} value={milestone.id}>
                    {milestone.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status and Priority Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={watchedStatus}
                onValueChange={(value: any) => setValue('status', value)}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={watchedPriority}
                onValueChange={(value: any) => setValue('priority', value)}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Assignee */}
          <div className="space-y-2">
            <Label htmlFor="assignee">Assignee (Optional)</Label>
            <Select
              value={watchedAssigneeId || ''}
              onValueChange={(value) => setValue('assignee_id', value)}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select assignee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Unassigned</SelectItem>
                {teamMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.display_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Time Estimates Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="estimated_hours">Estimated Hours</Label>
              <Input
                id="estimated_hours"
                type="number"
                min="0"
                step="0.5"
                {...register('estimated_hours', { valueAsNumber: true })}
                placeholder="0.0"
                disabled={isSubmitting}
              />
              {errors.estimated_hours && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {errors.estimated_hours.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="actual_hours">Actual Hours</Label>
              <Input
                id="actual_hours"
                type="number"
                min="0"
                step="0.5"
                {...register('actual_hours', { valueAsNumber: true })}
                placeholder="0.0"
                disabled={isSubmitting}
              />
              {errors.actual_hours && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {errors.actual_hours.message}
                </p>
              )}
            </div>
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label htmlFor="due_date">Due Date (Optional)</Label>
            <Input
              id="due_date"
              type="date"
              {...register('due_date')}
              disabled={isSubmitting}
            />
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-4 pt-6">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            )}

            <Button
              type="submit"
              disabled={isSubmitting || !watchedProjectId}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Update Task' : 'Create Task'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}


