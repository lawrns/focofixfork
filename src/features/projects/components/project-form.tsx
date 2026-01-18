'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Calendar, X } from 'lucide-react'
import { useAuth } from '@/lib/hooks/use-auth'
import { ColorPicker } from './color-picker'
import { SmartDateInput } from '@/components/forms/smart-date-input'
import { filterValidSelectOptions } from '@/lib/ui/select-validation'
import { audioService } from '@/lib/audio/audio-service'
import { hapticService } from '@/lib/audio/haptic-service'
import { apiClient } from '@/lib/api-client'

const projectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(500, 'Name must be less than 500 characters'),
  slug: z.string().min(1, 'Slug is required').max(100, 'Slug must be less than 100 characters'),
  description: z.string().max(2000, 'Description must be less than 2000 characters').optional(),
  workspace_id: z.string().min(1, 'Workspace is required'),
  status: z.enum(['planning', 'active', 'on_hold', 'completed', 'cancelled']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  start_date: z.string().optional(),
  due_date: z.string().optional(),
  progress_percentage: z.number().min(0).max(100).default(0),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format').default('#6366F1'),
})

type ProjectFormData = z.infer<typeof projectSchema>

interface ProjectFormProps {
  project?: ProjectFormData & { id?: string; progress_percentage?: number }
  workspaces: Array<{ id: string; name: string }>
  onSuccess?: () => void
  onCancel?: () => void
}

interface Organization {
  id: string
  name: string
}

export function ProjectForm({ project, workspaces, onSuccess, onCancel }: ProjectFormProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [slugError, setSlugError] = useState<string | null>(null)
  const [isCheckingSlug, setIsCheckingSlug] = useState(false)
  const [isSlugAvailable, setIsSlugAvailable] = useState<boolean | null>(null)
  const [hasManuallyEditedSlug, setHasManuallyEditedSlug] = useState(false)

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
      slug: '',
      description: project?.description || '',
      workspace_id: (project as any)?.workspace_id || workspaces[0]?.id || '',
      status: project?.status || 'planning',
      priority: project?.priority || 'medium',
      start_date: project?.start_date || '',
      due_date: project?.due_date || '',
      progress_percentage: project?.progress_percentage ?? 0,
      color: (project as any)?.color || '#6366F1',
    },
  })

  const watchedName = watch('name')
  const watchedSlug = watch('slug')
  const watchedStatus = watch('status')
  const watchedPriority = watch('priority')
  const watchedWorkspaceId = watch('workspace_id')
  const watchedColor = watch('color')

  const isEditing = !!project?.id

  // Helper function to generate slug from name
  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
  }

  // Auto-generate slug from name if not manually edited
  useEffect(() => {
    if (watchedName && !hasManuallyEditedSlug && !isEditing) {
      const generatedSlug = generateSlug(watchedName)
      setValue('slug', generatedSlug)
    }
  }, [watchedName, hasManuallyEditedSlug, isEditing, setValue])

  // Debounced slug uniqueness check
  useEffect(() => {
    if (!watchedSlug || isEditing) {
      return
    }

    const abortController = new AbortController()
    const timeoutId = setTimeout(async () => {
      setIsCheckingSlug(true)
      setSlugError(null)
      setIsSlugAvailable(null)

      try {
        const response = await fetch('/api/projects/check-slug', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            slug: watchedSlug,
            workspace_id: watchedWorkspaceId,
            project_id: project?.id,
          }),
          signal: abortController.signal,
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to check slug')
        }

        setIsSlugAvailable(data.available)
        if (!data.available) {
          setSlugError('Slug already taken')
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Slug check error:', err)
          // Don't block form submission on check error
          setIsSlugAvailable(true)
        }
      } finally {
        if (!abortController.signal.aborted) {
          setIsCheckingSlug(false)
        }
      }
    }, 500) // 500ms debounce

    return () => {
      clearTimeout(timeoutId)
      abortController.abort()
    }
  }, [watchedSlug, watchedWorkspaceId, isEditing, project?.id])

  const onSubmit = async (data: any) => {
    if (!user) return

    setIsSubmitting(true)
    setError(null)

    try {
      const url = isEditing ? `/api/projects/${project.id}` : '/api/projects'
      
      const response = await (isEditing 
        ? apiClient.put(url, data)
        : apiClient.post(url, data))

      if (!response.success) {
        const errorData = response
        audioService.play('error')
        hapticService.error()
        throw new Error(errorData.error || 'Failed to save project')
      }

      audioService.play('complete')
      hapticService.success()
      onSuccess?.()
    } catch (err: any) {
      console.error('Project save error:', err)
      audioService.play('error')
      hapticService.error()
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
            <Label htmlFor="name" className="text-sm font-semibold">Project Name *</Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="Enter project name"
              disabled={isSubmitting}
              className="min-h-[44px]"
            />
            {errors.name && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {errors.name.message}
              </p>
            )}
          </div>

          {/* Slug */}
          <div className="space-y-2">
            <Label htmlFor="slug" className="text-sm font-semibold">
              Slug *
              {isCheckingSlug && (
                <span className="ml-2 text-xs text-gray-500">Checking availability...</span>
              )}
              {isSlugAvailable === true && !isCheckingSlug && (
                <span className="ml-2 text-xs text-green-600">Available</span>
              )}
            </Label>
            <Input
              id="slug"
              {...register('slug', {
                onChange: () => setHasManuallyEditedSlug(true)
              })}
              placeholder="project-slug"
              disabled={isSubmitting || isEditing}
              className={cn("min-h-[44px]", slugError ? 'border-red-500' : '')}
            />
            {slugError && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {slugError}
              </p>
            )}
            {errors.slug && !slugError && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {errors.slug.message?.toString()}
              </p>
            )}
            <p className="text-xs text-gray-500">
              This will be used in the project URL. Only lowercase letters, numbers, and hyphens.
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-semibold">Description</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Describe your project..."
              rows={3}
              disabled={isSubmitting}
              className="min-h-[100px]"
            />
            {errors.description && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {errors.description.message?.toString()}
              </p>
            )}
          </div>

          {/* Workspace */}
          <div className="space-y-2">
            <Label htmlFor="workspace" className="text-sm font-semibold">Workspace *</Label>
            <Select
              value={watchedWorkspaceId}
              onValueChange={(value) => setValue('workspace_id', value)}
              disabled={isSubmitting}
            >
              <SelectTrigger className="min-h-[44px]">
                <SelectValue placeholder="Select workspace" />
              </SelectTrigger>
              <SelectContent>
                {filterValidSelectOptions(workspaces).map((ws) => (
                  <SelectItem key={ws.id} value={ws.id}>
                    {ws.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.workspace_id && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {errors.workspace_id.message?.toString()}
              </p>
            )}
          </div>

          {/* Status and Priority Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status" className="text-sm font-semibold">Status</Label>
              <Select
                value={watchedStatus}
                onValueChange={(value: any) => setValue('status', value)}
                disabled={isSubmitting}
              >
                <SelectTrigger className="min-h-[44px]">
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
              <Label htmlFor="priority" className="text-sm font-semibold">Priority</Label>
              <Select
                value={watchedPriority}
                onValueChange={(value: any) => setValue('priority', value)}
                disabled={isSubmitting}
              >
                <SelectTrigger className="min-h-[44px]">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SmartDateInput
              value={watch('start_date')}
              onDateStringChange={(dateStr) => setValue('start_date', dateStr || '', { shouldDirty: true })}
              label="Start Date"
              placeholder="Enter date or natural language"
              disabled={isSubmitting}
              error={errors.start_date?.message}
              className="min-h-[44px]"
            />

            <SmartDateInput
              value={watch('due_date')}
              onDateStringChange={(dateStr) => setValue('due_date', dateStr || '', { shouldDirty: true })}
              label="Due Date"
              placeholder="Enter date or natural language"
              disabled={isSubmitting}
              error={errors.due_date?.message}
              className="min-h-[44px]"
            />
          </div>

          {/* Color Picker */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Project Color</Label>
            <ColorPicker
              currentColor={watchedColor}
              onColorChange={(color) => setValue('color', color)}
            />
            {errors.color?.message && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {String(errors.color.message)}
              </p>
            )}
          </div>

          {/* Progress (only for existing projects) */}
          {isEditing && (
            <div className="space-y-2">
              <Label htmlFor="progress_percentage" className="text-sm font-semibold">Progress (%)</Label>
              <Input
                id="progress_percentage"
                type="number"
                inputMode="numeric"
                min="0"
                max="100"
                {...register('progress_percentage', { valueAsNumber: true })}
                disabled={isSubmitting}
                className="min-h-[44px]"
              />
              {errors.progress_percentage && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {errors.progress_percentage.message}
                </p>
              )}
            </div>
          )}

          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isSubmitting}
                className="min-h-[44px] sm:min-h-[40px] order-2 sm:order-1"
              >
                Cancel
              </Button>
            )}

            <Button
              type="submit"
              disabled={isSubmitting || isCheckingSlug || isSlugAvailable === false}
              className="min-h-[44px] sm:min-h-[40px] order-1 sm:order-2 font-bold"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? 'Update Project' : 'Create Project'}
            </Button>
          </div>
        </form>
  )
}


