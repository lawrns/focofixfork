'use client'

import { useState } from 'react'
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

const milestoneSchema = z.object({
  title: z.string().min(1, 'Milestone title is required').max(500, 'Title must be less than 500 characters'),
  description: z.string().max(2000, 'Description must be less than 2000 characters').optional(),
  project_id: z.string().min(1, 'Project is required'),
  status: z.enum(['planned', 'active', 'completed', 'cancelled']),
  due_date: z.string().optional(),
  progress_percentage: z.number().min(0).max(100),
})

type MilestoneFormData = z.infer<typeof milestoneSchema>

interface MilestoneFormProps {
  milestone?: MilestoneFormData & { id?: string }
  projects: Array<{ id: string; name: string }>
  onSuccess?: () => void
  onCancel?: () => void
}

export function MilestoneForm({
  milestone,
  projects,
  onSuccess,
  onCancel
}: MilestoneFormProps) {
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
    resolver: zodResolver(milestoneSchema),
    defaultValues: {
      title: milestone?.title || '',
      description: milestone?.description || '',
      project_id: milestone?.project_id || '',
      status: milestone?.status || 'planned',
      due_date: milestone?.due_date || '',
      progress_percentage: milestone?.progress_percentage || 0,
    },
  })

  const watchedStatus = watch('status')
  const watchedProjectId = watch('project_id')

  const isEditing = !!milestone?.id

  const onSubmit = async (data: any) => {
    if (!user) return

    setIsSubmitting(true)
    setError(null)

    try {
      // Clean up the data
      const submitData = {
        ...data,
        due_date: data.due_date || null,
      }

      const url = isEditing ? `/api/milestones/${milestone.id}` : '/api/milestones'
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
        throw new Error(errorData.error || 'Failed to save milestone')
      }

      onSuccess?.()
    } catch (err: any) {
      console.error('Milestone save error:', err)
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
          {isEditing ? 'Edit Milestone' : 'Create New Milestone'}
        </CardTitle>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Milestone Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Milestone Title *</Label>
            <Input
              id="title"
              {...register('title')}
              placeholder="Enter milestone title"
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
              placeholder="Describe what this milestone represents..."
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
              onValueChange={(value) => setValue('project_id', value)}
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

          {/* Status */}
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
                <SelectItem value="planned">Planned</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Due Date and Progress Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="due_date">Due Date</Label>
              <Input
                id="due_date"
                type="date"
                {...register('due_date')}
                disabled={isSubmitting}
              />
            </div>

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
              {isEditing ? 'Update Milestone' : 'Create Milestone'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}


