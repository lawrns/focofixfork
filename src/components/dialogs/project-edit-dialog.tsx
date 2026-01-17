'use client'

import React, { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/toast/toast'
import { Loader2 } from 'lucide-react'
import { audioService } from '@/lib/audio/audio-service'
import { hapticService } from '@/lib/audio/haptic-service'
import {
  UpdateProjectSchema,
  type UpdateProject,
  type Project,
  ProjectStatus,
  ProjectPriority
} from '@/lib/validation/schemas/project.schema'

interface ProjectEditDialogProps {
  project: Project
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (projectId: string, data: UpdateProject) => Promise<void>
}

export default function ProjectEditDialog({
  project,
  open,
  onOpenChange,
  onSave
}: ProjectEditDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    control,
    formState: { errors, isDirty }
  } = useForm<UpdateProject>({
    resolver: zodResolver(UpdateProjectSchema)
  })

  // Initialize form when dialog opens with current project data
  useEffect(() => {
    if (open) {
      reset({
        name: project.name,
        description: project.description || '',
        status: project.status,
        priority: project.priority,
        due_date: project.due_date || null,
        start_date: project.start_date || null,
      })
    }
  }, [open, project, reset])


  const onSubmit = async (data: UpdateProject) => {
    if (!isDirty) {
      onOpenChange(false)
      return
    }

    // Convert empty strings to null for date fields
    const processedData = {
      ...data,
      due_date: data.due_date === '' ? null : data.due_date,
      start_date: data.start_date === '' ? null : data.start_date,
    }

    setIsLoading(true)
    try {
      await onSave(project.id, processedData)
      audioService.play('complete')
      hapticService.success()
      toast({
        title: 'Success',
        description: 'Project updated successfully',
      })
      // Close dialog first, then reset form to prevent race conditions
      onOpenChange(false)
      // Small delay to ensure dialog closes before resetting
      setTimeout(() => {
        reset()
      }, 100)
    } catch (error) {
      audioService.play('error')
      hapticService.error()
      toast({
        title: 'Error',
        description: 'Failed to update project. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    if (isDirty) {
      // Could show a confirmation dialog here
      const confirm = window.confirm('You have unsaved changes. Are you sure you want to cancel?')
      if (!confirm) return
    }
    onOpenChange(false)
    reset()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Edit Project</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 py-2">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-semibold">Project Name</Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="Enter project name"
              className="min-h-[44px]"
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-semibold">Description</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Describe your project"
              rows={3}
              className="min-h-[100px]"
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="due_date" className="text-sm font-semibold">Due Date</Label>
            <Input
              id="due_date"
              type="date"
              {...register('due_date')}
              className="min-h-[44px]"
            />
            {errors.due_date && (
              <p className="text-sm text-destructive">{errors.due_date.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Status</Label>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="min-h-[44px]">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planning">Planning</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="on_hold">On Hold</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Priority</Label>
              <Controller
                name="priority"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="min-h-[44px]">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-3 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
              className="min-h-[44px] sm:min-h-[40px] order-2 sm:order-1 flex-1"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || !isDirty}
              className="min-h-[44px] sm:min-h-[40px] order-1 sm:order-2 flex-1 font-bold"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
