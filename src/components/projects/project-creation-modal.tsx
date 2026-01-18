'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Zap, FileText, ArrowLeft, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { ProjectForm } from '@/features/projects/components/project-form'
import { ProjectTemplateSelector } from '@/components/templates/project-template-selector'
import { ProjectTemplate } from '@/lib/models/template'
import { cn } from '@/lib/utils'

interface ProjectCreationModalProps {
  isOpen: boolean
  onClose: () => void
  workspaces: Array<{ id: string; name: string }>
  onProjectCreated?: (project: any) => void
  className?: string
}

type CreationMode = 'choose' | 'template' | 'form'

export function ProjectCreationModal({ 
  isOpen, 
  onClose, 
  workspaces, 
  onProjectCreated,
  className 
}: ProjectCreationModalProps) {
  const [creationMode, setCreationMode] = useState<CreationMode>('choose')
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplate | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  // Reset state when modal opens/closes
  React.useEffect(() => {
    if (isOpen) {
      setCreationMode('choose')
      setSelectedTemplate(null)
      setIsCreating(false)
    }
  }, [isOpen])

  // Handle template selection
  const handleTemplateSelect = (template: ProjectTemplate) => {
    setSelectedTemplate(template)
    setCreationMode('form')
  }

  // Handle project creation from template
  const handleProjectCreated = (project: any) => {
    setIsCreating(false)
    onProjectCreated?.(project)
    onClose()
  }

  // Handle project creation from form
  const handleFormSuccess = () => {
    onClose()
  }

  // Get template preview data
  const getTemplatePreview = () => {
    if (!selectedTemplate) return null

    return {
      name: selectedTemplate.data.name,
      description: selectedTemplate.data.description,
      taskCount: selectedTemplate.data.cards.length,
      columnCount: selectedTemplate.data.columns.length,
      columns: selectedTemplate.data.columns,
      sampleTasks: selectedTemplate.data.cards.slice(0, 3)
    }
  }

  const templatePreview = getTemplatePreview()

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {creationMode !== 'choose' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (creationMode === 'template') {
                    setCreationMode('choose')
                  } else if (creationMode === 'form') {
                    if (selectedTemplate) {
                      setCreationMode('template')
                    } else {
                      setCreationMode('choose')
                    }
                  }
                }}
                className="p-2"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div>
              <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                <Plus className="h-6 w-6 text-primary" />
                {creationMode === 'choose' && 'Create New Project'}
                {creationMode === 'template' && 'Choose a Template'}
                {creationMode === 'form' && selectedTemplate && 'Create Project from Template'}
                {creationMode === 'form' && !selectedTemplate && 'Create Project'}
              </DialogTitle>
              <DialogDescription>
                {creationMode === 'choose' && 'Start a new project from scratch or use a pre-built template to get started quickly.'}
                {creationMode === 'template' && 'Choose from our collection of project templates designed for different workflows and industries.'}
                {creationMode === 'form' && selectedTemplate && 'Fill in the details for your new project based on the selected template.'}
                {creationMode === 'form' && !selectedTemplate && 'Fill in the details for your new project.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            {creationMode === 'choose' && (
              <motion.div
                key="choose"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Start from Scratch */}
                  <Card 
                    className="cursor-pointer hover:shadow-lg transition-all duration-200 border-border/50 hover:border-primary/30"
                    onClick={() => setCreationMode('form')}
                  >
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        Start from Scratch
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Create a custom project with your own structure, tasks, and workflow.
                      </p>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <CheckCircle className="h-3 w-3" />
                          <span>Full customization</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <CheckCircle className="h-3 w-3" />
                          <span>Your own structure</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <CheckCircle className="h-3 w-3" />
                          <span>Complete control</span>
                        </div>
                      </div>
                      <Button className="w-full" variant="outline">
                        Create Custom Project
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Use Template */}
                  <Card 
                    className="cursor-pointer hover:shadow-lg transition-all duration-200 border-border/50 hover:border-primary/30"
                    onClick={() => setCreationMode('template')}
                  >
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Zap className="h-5 w-5 text-primary" />
                        Use a Template
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Start quickly with a pre-built project template designed for your workflow.
                      </p>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <CheckCircle className="h-3 w-3" />
                          <span>Pre-built structure</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <CheckCircle className="h-3 w-3" />
                          <span>Sample tasks included</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <CheckCircle className="h-3 w-3" />
                          <span>Best practices</span>
                        </div>
                      </div>
                      <Button className="w-full">
                        Browse Templates
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </motion.div>
            )}

            {creationMode === 'template' && (
              <motion.div
                key="template"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                <ProjectTemplateSelector
                  isOpen={true}
                  onClose={() => setCreationMode('choose')}
                  onSelectTemplate={handleTemplateSelect}
                />
              </motion.div>
            )}

            {creationMode === 'form' && (
              <motion.div
                key="form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {/* Template Preview */}
                {selectedTemplate && templatePreview && (
                  <Card className="border-primary/20 bg-primary/5">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Zap className="h-5 w-5 text-primary" />
                        Template Preview: {selectedTemplate.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        {selectedTemplate.description}
                      </p>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Tasks:</span> {templatePreview.taskCount}
                        </div>
                        <div>
                          <span className="font-medium">Columns:</span> {templatePreview.columnCount}
                        </div>
                      </div>

                      {templatePreview.sampleTasks.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium">Sample Tasks:</h4>
                          <div className="space-y-1">
                            {templatePreview.sampleTasks.map((task) => (
                              <div key={task.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                                <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                                <span>{task.title}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Project Form */}
                <div className="max-h-96 overflow-y-auto">
                  <ProjectForm
                    workspaces={workspaces}
                    onSuccess={handleFormSuccess}
                    onCancel={() => {
                      if (selectedTemplate) {
                        setCreationMode('template')
                      } else {
                        setCreationMode('choose')
                      }
                    }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ProjectCreationModal

