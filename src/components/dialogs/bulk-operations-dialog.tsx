'use client'

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/toast/toast'
import { Loader2, Archive, Trash2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import { type Project } from '@/lib/validation/schemas/project.schema'

interface BulkOperationsDialogProps {
  selectedProjects: Project[]
  operation: 'archive' | 'delete' | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onExecute: (operation: 'archive' | 'delete', projectIds: string[], force?: boolean) => Promise<{
    successful: string[]
    failed: { id: string; error: string }[]
  }>
}

export default function BulkOperationsDialog({
  selectedProjects,
  operation,
  open,
  onOpenChange,
  onExecute
}: BulkOperationsDialogProps) {
  const [isExecuting, setIsExecuting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<{
    successful: string[]
    failed: { id: string; error: string }[]
  } | null>(null)
  const { toast } = useToast()

  const getOperationConfig = () => {
    if (operation === 'archive') {
      return {
        title: 'Archive Projects',
        description: 'Mark selected projects as completed. They will be hidden from active views.',
        icon: Archive,
        confirmText: 'Archive',
        variant: 'default' as const
      }
    } else if (operation === 'delete') {
      return {
        title: 'Delete Projects',
        description: 'Permanently delete selected projects. This action cannot be undone.',
        icon: AlertTriangle,
        confirmText: 'Delete',
        variant: 'destructive' as const
      }
    }
    return null
  }

  const config = getOperationConfig()

  const handleExecute = async () => {
    if (!operation || !config) return

    setIsExecuting(true)
    setProgress(0)
    setResults(null)

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90))
      }, 200)

      const result = await onExecute(operation, selectedProjects.map(p => p.id), operation === 'delete' ? true : undefined)

      clearInterval(progressInterval)
      setProgress(100)
      setResults(result)

      if (result.failed.length === 0) {
        toast({
          title: 'Success',
          description: `${result.successful.length} projects ${operation}d successfully`,
        })
      } else if (result.successful.length > 0) {
        toast({
          title: 'Partial Success',
          description: `${result.successful.length} projects ${operation}d, ${result.failed.length} failed`,
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Failed',
          description: `All ${result.failed.length} operations failed`,
          variant: 'destructive',
        })
      }
    } catch (error) {
      setProgress(100)
      setResults({ successful: [], failed: selectedProjects.map(p => ({ id: p.id, error: 'Network error' })) })
      toast({
        title: 'Error',
        description: 'Bulk operation failed. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsExecuting(false)
    }
  }

  const handleClose = () => {
    if (isExecuting) return
    onOpenChange(false)
    setResults(null)
    setProgress(0)
  }

  const getProjectName = (id: string) => {
    return selectedProjects.find(p => p.id === id)?.name || `Project ${id.slice(-4)}`
  }

  if (!config) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
              config.variant === 'destructive' ? 'bg-destructive/10' : 'bg-primary/10'
            }`}>
              <config.icon className={`h-5 w-5 ${
                config.variant === 'destructive' ? 'text-destructive' : 'text-primary'
              }`} />
            </div>
            <div>
              <DialogTitle>{config.title}</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-1">
                {config.description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Selected Projects Summary */}
          <div className="rounded-lg border bg-muted/50 p-3">
            <div className="text-sm font-medium mb-2">
              {selectedProjects.length} project{selectedProjects.length !== 1 ? 's' : ''} selected:
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {selectedProjects.slice(0, 5).map(project => (
                <div key={project.id} className="text-sm text-muted-foreground flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary"></div>
                  {project.name}
                </div>
              ))}
              {selectedProjects.length > 5 && (
                <div className="text-sm text-muted-foreground">
                  ... and {selectedProjects.length - 5} more
                </div>
              )}
            </div>
          </div>

          {/* Progress and Results */}
          {(isExecuting || results) && (
            <div className="space-y-3">
              {isExecuting && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Processing...</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="w-full" />
                </div>
              )}

              {results && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>{results.successful.length} successful</span>
                  </div>

                  {results.failed.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <XCircle className="h-4 w-4 text-red-500" />
                        <span>{results.failed.length} failed</span>
                      </div>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {results.failed.map(failure => (
                          <div key={failure.id} className="text-xs p-2 bg-destructive/10 rounded border-l-2 border-destructive">
                            <div className="font-medium">{getProjectName(failure.id)}</div>
                            <div className="text-destructive">{failure.error}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Bulk Operation Warning for Delete */}
          {operation === 'delete' && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                <div className="text-sm">
                  <div className="font-medium text-destructive mb-1">Warning</div>
                  <div className="text-muted-foreground">
                    This will permanently delete the selected projects along with all their tasks, milestones, and team assignments.
                    Organizations will remain intact. This action cannot be undone.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isExecuting}
          >
            {results ? 'Close' : 'Cancel'}
          </Button>
          {!results && (
            <Button
              variant={config.variant}
              onClick={handleExecute}
              disabled={isExecuting || selectedProjects.length === 0}
            >
              {isExecuting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {config.confirmText} {selectedProjects.length} Project{selectedProjects.length !== 1 ? 's' : ''}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

