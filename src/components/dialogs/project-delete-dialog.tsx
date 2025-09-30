'use client'

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/toast/toast'
import { Loader2, AlertTriangle } from 'lucide-react'
import { type Project } from '@/lib/validation/schemas/project.schema'

interface ProjectDeleteDialogProps {
  project: Project | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDelete: (projectId: string) => Promise<void>
}

export default function ProjectDeleteDialog({
  project,
  open,
  onOpenChange,
  onDelete
}: ProjectDeleteDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleDelete = async () => {
    if (!project) return

    setIsLoading(true)
    try {
      await onDelete(project.id)
      toast({
        title: 'Success',
        description: 'Project deleted successfully',
      })
      onOpenChange(false)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete project. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    onOpenChange(false)
  }

  if (!project) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <DialogTitle>Delete Project</DialogTitle>
              <DialogDescription className="mt-1">
                This action cannot be undone. This will permanently delete the project
                and all associated data.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg border border-border bg-muted/50 p-3">
            <div className="text-sm font-medium text-foreground">
              Project: {project.name}
            </div>
            {project.description && (
              <div className="text-sm text-muted-foreground mt-1">
                {project.description}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete Project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

