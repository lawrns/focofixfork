'use client'

import { useState } from 'react'
import MainLayout from '@/components/layout/MainLayout'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { ProjectList, ProjectForm } from '@/features/projects'
import { ProjectCreationModal } from '@/components/projects/project-creation-modal'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus } from 'lucide-react'
import { useAuth } from '@/lib/hooks/use-auth'

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
      <ProjectList
        showCreateButton={true}
        onCreateProject={handleCreateProject}
        onEditProject={handleEditProject}
        onDeleteProject={handleDeleteProject}
      />

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
    </MainLayout>
  )
}