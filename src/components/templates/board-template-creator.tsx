'use client'

import { useState } from 'react'
import { Save, Eye, Share2, Lock, Globe, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ProjectTemplate, TemplateCategory } from '@/lib/models/template'
import { cn } from '@/lib/utils'

interface BoardTemplateCreatorProps {
  isOpen: boolean
  onClose: () => void
  onCreateTemplate: (template: Omit<ProjectTemplate, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
  currentProject?: {
    id: string
    name: string
    description?: string
    columns: Array<{ id: string; name: string; position: number }>
    cards: Array<{ id: string; title: string; status: string }>
    labels: Array<{ id: string; name: string; color: string }>
  }
  className?: string
}

export function BoardTemplateCreator({
  isOpen,
  onClose,
  onCreateTemplate,
  currentProject,
  className
}: BoardTemplateCreatorProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [templateData, setTemplateData] = useState({
    name: currentProject?.name || '',
    description: currentProject?.description || '',
    category: 'general' as TemplateCategory,
    is_public: false,
    include_sample_data: true,
    tags: [] as string[]
  })
  const [newTag, setNewTag] = useState('')

  const categories: Array<{ value: TemplateCategory; label: string }> = [
    { value: 'marketing', label: 'Marketing' },
    { value: 'engineering', label: 'Engineering' },
    { value: 'design', label: 'Design' },
    { value: 'sales', label: 'Sales' },
    { value: 'personal', label: 'Personal' },
    { value: 'general', label: 'General' }
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!templateData.name.trim()) return

    setIsLoading(true)
    try {
      const template: Omit<ProjectTemplate, 'id' | 'created_at' | 'updated_at'> = {
        name: templateData.name.trim(),
        description: templateData.description.trim(),
        category: templateData.category,
        type: 'project',
        data: {
          name: templateData.name.trim(),
          description: templateData.description.trim(),
          status: 'active',
          priority: 'medium',
          columns: currentProject?.columns.map(col => ({
            id: col.id,
            name: col.name,
            position: col.position,
            color: '#6b7280'
          })) || [],
          cards: templateData.include_sample_data ? (currentProject?.cards.map(card => ({
            id: card.id,
            title: card.title,
            description: `Sample card from ${templateData.name}`,
            status: card.status,
            priority: 'medium' as const,
            labels: []
          })) || []) : [],
          labels: currentProject?.labels.map(label => ({
            id: label.id,
            name: label.name,
            color: label.color
          })) || [],
          settings: {
            default_view: 'kanban',
            auto_assign: false,
            notifications: true
          }
        },
        is_public: templateData.is_public,
        owner_id: 'current-user', // This would be the actual user ID
        usage_count: 0,
        rating: 0,
        tags: templateData.tags
      }

      await onCreateTemplate(template)
      onClose()
    } catch (error) {
      console.error('Failed to create template:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const addTag = () => {
    if (newTag.trim() && !templateData.tags.includes(newTag.trim())) {
      setTemplateData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }))
      setNewTag('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setTemplateData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="w-5 h-5" />
            Save as Template
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Template Details
            </h3>
            
            <div className="space-y-2">
              <Label htmlFor="template-name">Template Name</Label>
              <Input
                id="template-name"
                value={templateData.name}
                onChange={(e) => setTemplateData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter template name..."
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="template-description">Description</Label>
              <Textarea
                id="template-description"
                value={templateData.description}
                onChange={(e) => setTemplateData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what this template is for..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="template-category">Category</Label>
              <Select
                value={templateData.category}
                onValueChange={(value) => setTemplateData(prev => ({ ...prev, category: value as TemplateCategory }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Visibility Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Visibility
            </h3>
            
            <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/20">
                  {templateData.is_public ? (
                    <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  ) : (
                    <Lock className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {templateData.is_public ? 'Public Template' : 'Private Template'}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {templateData.is_public 
                      ? 'Anyone can discover and use this template'
                      : 'Only you can see and use this template'
                    }
                  </p>
                </div>
              </div>
              <Switch
                checked={templateData.is_public}
                onCheckedChange={(checked) => setTemplateData(prev => ({ ...prev, is_public: checked }))}
              />
            </div>
          </div>

          {/* Content Options */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Content Options
            </h3>
            
            <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/20">
                  <Eye className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    Include Sample Data
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Include current cards and labels as examples
                  </p>
                </div>
              </div>
              <Switch
                checked={templateData.include_sample_data}
                onCheckedChange={(checked) => setTemplateData(prev => ({ ...prev, include_sample_data: checked }))}
              />
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Tags
            </h3>
            
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Add a tag..."
                  className="flex-1"
                />
                <Button type="button" onClick={addTag} variant="outline">
                  Add
                </Button>
              </div>
              
              {templateData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {templateData.tags.map((tag) => (
                    <div
                      key={tag}
                      className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-md text-sm"
                    >
                      <span>{tag}</span>
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Preview
            </h3>
            
            <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900 dark:text-gray-100">
                  {templateData.name || 'Template Name'}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {templateData.description || 'Template description...'}
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded">
                    {categories.find(c => c.value === templateData.category)?.label}
                  </span>
                  {templateData.is_public ? (
                    <span className="flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      Public
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      Private
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !templateData.name.trim()}>
              {isLoading ? 'Creating...' : 'Create Template'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
