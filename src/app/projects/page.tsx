'use client'

import { useState } from 'react'
import MainLayout from '@/components/layout/MainLayout'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { ProjectList, ProjectForm } from '@/features/projects'
import ProjectTable from '@/features/projects/components/ProjectTable'
import { ProjectCreationModal } from '@/components/projects/project-creation-modal'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { motion } from 'framer-motion'
import Script from 'next/script'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus } from 'lucide-react'
import { useAuth } from '@/lib/hooks/use-auth'
import { ImportExportModal } from '@/components/import-export/import-export-modal'
import { AIProjectCreator } from '@/components/ai/ai-project-creator'

export default function ProjectsPage() {
  return (
    <ProtectedRoute>
      <ProjectsContent />
    </ProtectedRoute>
  )
}

function ProjectsContent() {
  const { user } = useAuth()
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showTemplateDialog, setShowTemplateDialog] = useState(false)
  const [editingProject, setEditingProject] = useState<any>(null)
  const [organizations, setOrganizations] = useState<Array<{ id: string; name: string }>>([])
  const [showAIDialog, setShowAIDialog] = useState(false)
  const modernizationEnabled = true

  // Organizations will be fetched by the ProjectForm component

  const handleCreateProject = () => {
    setEditingProject(null)
    setOrganizations([])
    setShowTemplateDialog(true)
  }

  const handleEditProject = async (projectId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}`)
      if (response.ok) {
        const data = await response.json()
        setEditingProject(data.data)
        setShowCreateDialog(true)
      } else {
        console.error('Failed to fetch project:', response.statusText)
        alert('Failed to load project for editing')
      }
    } catch (error) {
      console.error('Error fetching project:', error)
      alert('Error loading project for editing')
    }
  }

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        alert('Project deleted successfully')
        // Refresh the page to update the project list
        window.location.reload()
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('Failed to delete project:', response.statusText, errorData)
        alert(`Failed to delete project: ${errorData.error || response.statusText}`)
      }
    } catch (error) {
      console.error('Error deleting project:', error)
      alert('Error deleting project')
    }
  }

  const handleFormSuccess = () => {
    setShowCreateDialog(false)
    setEditingProject(null)
    // TODO: Refresh project list
  }

  const handleFormCancel = () => {
    setShowCreateDialog(false)
    setEditingProject(null)
  }

  return (
    <MainLayout>
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Projects</span>
            <div className="flex gap-2">
              <ImportExportModal />
              <Button variant="outline" onClick={() => setShowAIDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                AI Create
              </Button>
              <Button onClick={handleCreateProject}>
                <Plus className="w-4 h-4 mr-2" />
                New Project
              </Button>
            </div>
          </CardTitle>
          <CardDescription>Manage projects, create new ones, and edit existing entries.</CardDescription>
        </CardHeader>
      </Card>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        {modernizationEnabled ? (
          <ProjectTable
            onCreateProject={handleCreateProject}
          />
        ) : (
          <ProjectList
            showCreateButton={true}
            onCreateProject={handleCreateProject}
            onEditProject={handleEditProject}
            onDeleteProject={handleDeleteProject}
          />
        )}
      </motion.div>

      <Script id="jsonld-projects" type="application/ld+json" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Dashboard', item: '/dashboard' },
          { '@type': 'ListItem', position: 2, name: 'Projects', item: '/projects' }
        ]
      }) }} />

      {/* Project Creation Modal with Templates */}
      <ProjectCreationModal
        isOpen={showTemplateDialog}
        onClose={() => setShowTemplateDialog(false)}
        organizations={organizations}
        onProjectCreated={handleFormSuccess}
      />

      {/* Edit Project Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
          </DialogHeader>

          <ProjectForm
            project={editingProject}
            organizations={organizations}
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showAIDialog} onOpenChange={setShowAIDialog}>
        <DialogContent className="max-w-3xl w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle>Create Project with AI</DialogTitle>
          </DialogHeader>
          <AIProjectCreator
            onSuccess={(projectId) => {
              setShowAIDialog(false)
              window.location.href = `/projects/${projectId}`
            }}
            onCancel={() => setShowAIDialog(false)}
          />
        </DialogContent>
      </Dialog>
    </MainLayout>
  )
}
