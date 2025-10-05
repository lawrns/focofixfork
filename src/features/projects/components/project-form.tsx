'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Calendar, X } from 'lucide-react'
import { useAuth } from '@/lib/hooks/use-auth'

const projectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(500, 'Name must be less than 500 characters'),
  description: z.string().max(2000, 'Description must be less than 2000 characters').optional(),
  organization_id: z.string().min(1, 'Organization is required'),
  status: z.enum(['planning', 'active', 'on_hold', 'completed', 'cancelled']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  start_date: z.string().optional(),
  due_date: z.string().optional(),
  progress_percentage: z.number().min(0).max(100).default(0),
})

type ProjectFormData = z.infer<typeof projectSchema>

interface ProjectFormProps {
  project?: ProjectFormData & { id?: string; progress_percentage?: number }
  organizations: Array<{ id: string; name: string }>
  onSuccess?: () => void
  onCancel?: () => void
}

interface Organization {
  id: string
  name: string
}

export function ProjectForm({ project, organizations, onSuccess, onCancel }: ProjectFormProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: project?.name || '',
      description: project?.description || '',
      organization_id: project?.organization_id || organizations[0]?.id || '',
      status: project?.status || 'planning',
      priority: project?.priority || 'medium',
      start_date: project?.start_date || '',
      due_date: project?.due_date || '',
      progress_percentage: project?.progress_percentage ?? 0,
    },
  })

  const watchedStatus = watch('status')
  const watchedPriority = watch('priority')
  const watchedOrganizationId = watch('organization_id')

  const isEditing = !!project?.id

  const onSubmit = async (data: any) => {
    if (!user) return

    setIsSubmitting(true)
    setError(null)

    try {
      const url = isEditing ? `/api/projects/${project.id}` : '/api/projects'
      const method = isEditing ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save project')
      }

      onSuccess?.()
    } catch (err: any) {
      console.error('Project save error:', err)
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Project Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Project Name *</Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="Enter project name"
              disabled={isSubmitting}
            />
            {errors.name && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {errors.name.message}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Describe your project..."
              rows={3}
              disabled={isSubmitting}
            />
            {errors.description && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {errors.description.message}
              </p>
            )}
          </div>

          {/* Organization */}
          <div className="space-y-2">
            <Label htmlFor="organization">Organization *</Label>
            <Select
              value={watchedOrganizationId}
              onValueChange={(value) => setValue('organization_id', value)}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select organization" />
              </SelectTrigger>
              <SelectContent>
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.organization_id && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {errors.organization_id.message}
              </p>
            )}
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
                  <SelectItem value="planning">Planning</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
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

          {/* Dates Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date</Label>
              <Input
                id="start_date"
                type="date"
                {...register('start_date')}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="due_date">Due Date</Label>
              <Input
                id="due_date"
                type="date"
                {...register('due_date')}
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Progress (only for existing projects) */}
          {isEditing && (
            <div className="space-y-2">
              <Label htmlFor="progress_percentage">Progress (%)</Label>
              <Input
                id="progress_percentage"
                type="number"
                min="0"
                max="100"
                {...register('progress_percentage', { valueAsNumber: true })}
                disabled={isSubmitting}
              />
              {errors.progress_percentage && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {errors.progress_percentage.message}
                </p>
              )}
            </div>
          )}

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
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Update Project' : 'Create Project'}
            </Button>
          </div>
        </form>
  )
}


