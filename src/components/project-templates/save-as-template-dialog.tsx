'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

interface SaveAsTemplateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  projectName: string
  projectDescription?: string
  workspaceId: string
  onSuccess?: () => void
}

export function SaveAsTemplateDialog({
  open,
  onOpenChange,
  projectId,
  projectName,
  projectDescription,
  workspaceId,
  onSuccess,
}: SaveAsTemplateDialogProps) {
  const [loading, setLoading] = useState(false)
  const [isPublic, setIsPublic] = useState(false)
  const [templateName, setTemplateName] = useState(`${projectName} Template`)
  const [templateDescription, setTemplateDescription] = useState(projectDescription || '')

  const handleSave = async () => {
    if (!templateName.trim()) {
      toast.error('Template name is required')
      return
    }

    setLoading(true)
    try {
      // Fetch project data to extract structure
      const projectRes = await fetch(`/api/projects/${projectId}`)
      if (!projectRes.ok) throw new Error('Failed to fetch project')
      const { data: project } = await projectRes.json()

      // Fetch project tasks for default tasks
      const tasksRes = await fetch(`/api/tasks?project_id=${projectId}&limit=100`)
      if (!tasksRes.ok) throw new Error('Failed to fetch tasks')
      const { data: tasksData } = await tasksRes.json()

      const defaultTasks = (tasksData?.data || []).map((task: any) => ({
        title: task.title,
        description: task.description || undefined,
        priority: task.priority || 'medium',
      }))

      // Create template
      const response = await fetch('/api/project-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: templateName,
          description: templateDescription,
          workspace_id: workspaceId,
          structure: {
            defaultTasks,
            customFields: [],
          },
          is_public: isPublic,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save template')
      }

      toast.success('Template saved successfully')
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      console.error('Error saving template:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save template')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save as Template</DialogTitle>
          <DialogDescription>Create a reusable template from this project</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="template-name">Template Name</Label>
            <Input
              id="template-name"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="e.g., Product Launch Template"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="template-description">Description</Label>
            <Textarea
              id="template-description"
              value={templateDescription}
              onChange={(e) => setTemplateDescription(e.target.value)}
              placeholder="What is this template for?"
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="is-public"
              checked={isPublic}
              onCheckedChange={(checked) => setIsPublic(checked as boolean)}
            />
            <Label htmlFor="is-public" className="cursor-pointer">
              Make this template available to team members
            </Label>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg text-sm text-blue-700 dark:text-blue-300">
            Your template will include all tasks from this project.
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Template'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
