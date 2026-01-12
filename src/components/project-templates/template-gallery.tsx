'use client'

import { useEffect, useState, useCallback } from 'react'
import { ProjectTemplate } from '@/lib/models/project-templates'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { TemplatePreviewDialog } from './template-preview-dialog'
import { Loader } from 'lucide-react'

interface TemplateGalleryProps {
  workspaceId: string
  onSelectTemplate: (template: ProjectTemplate) => void
}

export function TemplateGallery({ workspaceId, onSelectTemplate }: TemplateGalleryProps) {
  const [templates, setTemplates] = useState<ProjectTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplate | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(
        `/api/project-templates?workspace_id=${workspaceId}&is_public=true`
      )

      if (!response.ok) throw new Error('Failed to fetch templates')

      const { data } = await response.json()
      setTemplates(data.templates || [])
    } catch (error) {
      console.error('Error fetching templates:', error)
      toast.error('Failed to load templates')
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  const handlePreview = (template: ProjectTemplate) => {
    setSelectedTemplate(template)
    setPreviewOpen(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (templates.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No templates available</p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => (
          <Card key={template.id} className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <CardDescription className="mt-1 text-sm">
                    {template.description}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Tasks:</span>
                  <Badge variant="secondary">
                    {template.structure.defaultTasks.length}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Fields:</span>
                  <Badge variant="secondary">
                    {template.structure.customFields.length}
                  </Badge>
                </div>
              </div>

              {template.usage_count && template.usage_count > 0 && (
                <div className="text-xs text-muted-foreground">
                  Used {template.usage_count} times
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handlePreview(template)}
                >
                  Preview
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => onSelectTemplate(template)}
                >
                  Use Template
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedTemplate && (
        <TemplatePreviewDialog
          template={selectedTemplate}
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          onUse={() => {
            onSelectTemplate(selectedTemplate)
            setPreviewOpen(false)
          }}
        />
      )}
    </>
  )
}
