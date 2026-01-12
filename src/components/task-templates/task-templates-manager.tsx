'use client'

import React, { useState } from 'react'
import { useTaskTemplates, TaskTemplate } from '@/hooks/use-task-templates'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Trash2, Plus, Copy } from 'lucide-react'

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
      alert('Failed to create template')
    }
  }

  const handleDeleteTemplate = async (id: string) => {
    if (confirm('Are you sure you want to delete this template?')) {
      try {
        await deleteTemplate(id)
        await refreshTemplates()
      } catch (err) {
        console.error('Failed to delete template:', err)
        alert('Failed to delete template')
      }
    }
  }

  if (loading) {
    return <div>Loading templates...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Task Templates</h2>
        <Button onClick={() => setShowCreateDialog(true)} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          New Template
        </Button>
      </div>

      {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</div>}

      {templates.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          <p>No templates yet. Create one to get started!</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {templates.map(template => (
            <div
              key={template.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
            >
              <div className="flex-1">
                <h3 className="font-medium text-sm">{template.name}</h3>
                <p className="text-xs text-gray-600">{template.title_template}</p>
                {template.tags && template.tags.length > 0 && (
                  <div className="flex gap-1 mt-2">
                    {template.tags.map(tag => (
                      <span key={tag} className="inline-block px-2 py-1 bg-gray-100 text-xs rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2 ml-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onTemplateSelected?.(template)}
                  className="text-blue-600"
                >
                  <Copy className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteTemplate(template.id)}
                  className="text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Task Template</DialogTitle>
            <DialogDescription>Create a reusable template for common tasks</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Template Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Bug Report, Feature Request"
              />
            </div>

            <div>
              <Label htmlFor="title_template">Title Template</Label>
              <Input
                id="title_template"
                value={formData.title_template}
                onChange={e => setFormData({ ...formData, title_template: e.target.value })}
                placeholder="e.g., Bug: {{description}}"
              />
            </div>

            <div>
              <Label htmlFor="description_template">Description Template</Label>
              <Textarea
                id="description_template"
                value={formData.description_template}
                onChange={e => setFormData({ ...formData, description_template: e.target.value })}
                placeholder="e.g., Steps to reproduce..."
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select value={formData.priority} onValueChange={val => setFormData({ ...formData, priority: val })}>
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

            <div>
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                value={formData.tags}
                onChange={e => setFormData({ ...formData, tags: e.target.value })}
                placeholder="e.g., bug, frontend, urgent"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTemplate}>Create Template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
