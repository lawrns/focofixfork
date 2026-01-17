'use client'

import React, { useState } from 'react'
import { useTaskTemplates, TaskTemplate } from '@/hooks/use-task-templates'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Trash2, Plus, Copy, Loader2 } from 'lucide-react'
import { audioService } from '@/lib/audio/audio-service'
import { hapticService } from '@/lib/audio/haptic-service'

interface TaskTemplatesManagerProps {
  onTemplateSelected?: (template: TaskTemplate) => void
}

export function TaskTemplatesManager({ onTemplateSelected }: TaskTemplatesManagerProps) {
  const { templates, loading, error, createTemplate, deleteTemplate, refreshTemplates } = useTaskTemplates()
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    title_template: '',
    description_template: '',
    tags: '',
    priority: 'medium'
  })

  const handleCreateTemplate = async () => {
    if (!formData.name || !formData.title_template) {
      audioService.play('error')
      hapticService.error()
      alert('Please fill in required fields')
      return
    }

    try {
      const tags = formData.tags
        ? formData.tags.split(',').map(t => t.trim()).filter(Boolean)
        : null

      await createTemplate({
        name: formData.name,
        title_template: formData.title_template,
        description_template: formData.description_template || null,
        tags,
        priority: formData.priority
      })

      audioService.play('complete')
      hapticService.success()
      setFormData({
        name: '',
        title_template: '',
        description_template: '',
        tags: '',
        priority: 'medium'
      })
      setShowCreateDialog(false)
      await refreshTemplates()
    } catch (err) {
      console.error('Failed to create template:', err)
      audioService.play('error')
      hapticService.error()
      alert('Failed to create template')
    }
  }

  const handleDeleteTemplate = async (id: string) => {
    if (confirm('Are you sure you want to delete this template?')) {
      try {
        await deleteTemplate(id)
        audioService.play('error')
        hapticService.error()
        await refreshTemplates()
      } catch (err) {
        console.error('Failed to delete template:', err)
        audioService.play('error')
        hapticService.error()
        alert('Failed to delete template')
      }
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground mr-2" /> Loading templates...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Task Templates</h2>
        <Button onClick={() => setShowCreateDialog(true)} size="sm" className="min-h-[40px]">
          <Plus className="w-4 h-4 mr-2" />
          New Template
        </Button>
      </div>

      {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded border border-red-200">{error}</div>}

      {templates.length === 0 ? (
        <div className="text-center text-gray-500 py-12 border-2 border-dashed rounded-xl">
          <p>No templates yet. Create one to get started!</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {templates.map(template => (
            <div
              key={template.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors gap-4"
            >
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm truncate">{template.name}</h3>
                <p className="text-xs text-gray-600 truncate">{template.title_template}</p>
                {template.tags && template.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {template.tags.map(tag => (
                      <span key={tag} className="inline-block px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-[10px] rounded font-medium">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2 self-end sm:self-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    hapticService.light();
                    onTemplateSelected?.(template);
                  }}
                  className="text-blue-600 h-10 w-10 sm:h-8 sm:w-8 p-0"
                  aria-label={`Use template ${template.name}`}
                >
                  <Copy className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteTemplate(template.id)}
                  className="text-red-600 h-10 w-10 sm:h-8 sm:w-8 p-0"
                  aria-label={`Delete template ${template.name}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Create Task Template</DialogTitle>
            <DialogDescription>Create a reusable template for common tasks</DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-2">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-semibold">Template Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Bug Report, Feature Request"
                className="min-h-[44px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="title_template" className="text-sm font-semibold">Title Template *</Label>
              <Input
                id="title_template"
                value={formData.title_template}
                onChange={e => setFormData({ ...formData, title_template: e.target.value })}
                placeholder="e.g., Bug: {{description}}"
                className="min-h-[44px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description_template" className="text-sm font-semibold">Description Template</Label>
              <Textarea
                id="description_template"
                value={formData.description_template}
                onChange={e => setFormData({ ...formData, description_template: e.target.value })}
                placeholder="e.g., Steps to reproduce..."
                rows={4}
                className="min-h-[100px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority" className="text-sm font-semibold">Priority</Label>
              <Select value={formData.priority} onValueChange={val => setFormData({ ...formData, priority: val })}>
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

            <div className="space-y-2">
              <Label htmlFor="tags" className="text-sm font-semibold">Tags (comma-separated)</Label>
              <Input
                id="tags"
                value={formData.tags}
                onChange={e => setFormData({ ...formData, tags: e.target.value })}
                placeholder="e.g., bug, frontend, urgent"
                className="min-h-[44px]"
              />
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-3 mt-6">
            <Button 
              variant="outline" 
              onClick={() => setShowCreateDialog(false)}
              className="min-h-[44px] sm:min-h-[40px] order-2 sm:order-1 flex-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateTemplate}
              className="min-h-[44px] sm:min-h-[40px] order-1 sm:order-2 flex-1 font-bold"
            >
              Create Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
