'use client'

import { ProjectTemplate } from '@/lib/models/project-templates'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2 } from 'lucide-react'

interface TemplatePreviewDialogProps {
  template: ProjectTemplate
  open: boolean
  onOpenChange: (open: boolean) => void
  onUse: () => void
}

export function TemplatePreviewDialog({
  template,
  open,
  onOpenChange,
  onUse,
}: TemplatePreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{template.name}</DialogTitle>
          <DialogDescription>{template.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Default Tasks */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Default Tasks ({template.structure.defaultTasks.length})</h3>
            <div className="space-y-2">
              {template.structure.defaultTasks.length > 0 ? (
                template.structure.defaultTasks.map((task, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                    <CheckCircle2 className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{task.title}</div>
                      {task.description && (
                        <div className="text-xs text-muted-foreground mt-1">{task.description}</div>
                      )}
                      <div className="mt-2">
                        <Badge
                          variant="secondary"
                          className={`text-xs ${
                            task.priority === 'urgent'
                              ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-100'
                              : task.priority === 'high'
                                ? 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-100'
                                : task.priority === 'medium'
                                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-100'
                                  : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-100'
                          }`}
                        >
                          {task.priority}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No default tasks</p>
              )}
            </div>
          </div>

          {/* Custom Fields */}
          {template.structure.customFields.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Custom Fields ({template.structure.customFields.length})</h3>
              <div className="space-y-2">
                {template.structure.customFields.map((field, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{field.name}</div>
                      <div className="text-xs text-muted-foreground">
                        Type: {field.type}
                        {field.required && ' • Required'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <div className="text-xs text-muted-foreground">Created</div>
              <div className="text-sm font-medium">
                {new Date(template.created_at).toLocaleDateString()}
              </div>
            </div>
            {template.usage_count !== undefined && template.usage_count > 0 && (
              <div>
                <div className="text-xs text-muted-foreground">Times Used</div>
                <div className="text-sm font-medium">{template.usage_count}</div>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          <Button onClick={onUse}>
            Use This Template
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
