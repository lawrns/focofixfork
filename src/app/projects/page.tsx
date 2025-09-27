'use client'

import { useState } from 'react'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { ProjectList } from '@/components/projects/project-list'
import { ProjectForm } from '@/components/projects/project-form'
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
  const [editingProject, setEditingProject] = useState<any>(null)
  const [organizations, setOrganizations] = useState<Array<{ id: string; name: string }>>([])

  // Mock organizations for now - in a real app, this would be fetched
  // TODO: Replace with actual organization fetching
  const mockOrganizations = [
    { id: '550e8400-e29b-41d4-a716-446655440000', name: 'Acme Corporation' },
    { id: '550e8400-e29b-41d4-a716-446655440002', name: 'TechStart Inc' },
  ]

  const handleCreateProject = () => {
    setEditingProject(null)
    setOrganizations(mockOrganizations)
    setShowCreateDialog(true)
  }

  const handleEditProject = (projectId: string) => {
    // TODO: Fetch project data and set editingProject
    console.log('Edit project:', projectId)
  }

  const handleDeleteProject = async (projectId: string) => {
    // TODO: Implement project deletion
    console.log('Delete project:', projectId)
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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <ProjectList
          showCreateButton={true}
          onCreateProject={handleCreateProject}
          onEditProject={handleEditProject}
          onDeleteProject={handleDeleteProject}
        />
      </div>

      {/* Create/Edit Project Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProject ? 'Edit Project' : 'Create New Project'}
            </DialogTitle>
          </DialogHeader>

          <ProjectForm
            project={editingProject}
            organizations={organizations}
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}